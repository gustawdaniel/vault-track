import { Client, InStatement } from '@libsql/client';
import crypto from 'node:crypto';

export interface ParsedSyncEvent {
    eventId: string;
    deviceId: string;
    counter: number;
    timestamp: number;
    type: string;
    payload: any;
}

/**
 * Parses an incoming transport event into a structured ParsedSyncEvent.
 * Supports both:
 * 1) payload = JSON.stringify(fullAppEvent)
 * 2) type + payload object/JSON
 */
export function parseIncomingEvent(raw: any): ParsedSyncEvent | null {
    if (!raw || !raw.eventId) return null;

    if (typeof raw.payload === 'string') {
        const trimmed = raw.payload.trim();
        if (!trimmed.startsWith('{')) {
            // Legacy encrypted ciphertext blob — cannot materialize
            return null;
        }
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && parsed.type && parsed.payload !== undefined) {
                return {
                    eventId: raw.eventId,
                    deviceId: raw.deviceId || parsed.deviceId || 'unknown',
                    counter: raw.counter ?? parsed.counter ?? 0,
                    timestamp: raw.timestamp ?? parsed.timestamp ?? Date.now(),
                    type: parsed.type,
                    payload: parsed.payload,
                };
            }
            if (raw.type) {
                return {
                    eventId: raw.eventId,
                    deviceId: raw.deviceId || 'unknown',
                    counter: raw.counter ?? 0,
                    timestamp: raw.timestamp ?? Date.now(),
                    type: raw.type,
                    payload: parsed,
                };
            }
        } catch {
            return null;
        }
    } else if (raw.type && raw.payload !== undefined) {
        return {
            eventId: raw.eventId,
            deviceId: raw.deviceId || 'unknown',
            counter: raw.counter ?? 0,
            timestamp: raw.timestamp ?? Date.now(),
            type: raw.type,
            payload: raw.payload,
        };
    }

    return null;
}

/**
 * Builds LibSQL statements for both storing the event in `events`
 * and materializing the entity change into relational tables (`accounts`, `transactions`, `categories`, `projects`, `asserts`).
 */
export function buildEventMaterializeStatements(groupId: string, rawEvents: any[]): InStatement[] {
    const statements: InStatement[] = [];

    for (const raw of rawEvents) {
        const parsed = parseIncomingEvent(raw);
        const serializedEvent = parsed
            ? JSON.stringify(parsed)
            : typeof raw.payload === 'string'
                ? raw.payload
                : JSON.stringify(raw);

        statements.push({
            sql: `INSERT INTO events (group_id, event_id, device_id, counter, timestamp, payload)
                  VALUES (?, ?, ?, ?, ?, ?)
                  ON CONFLICT(group_id, event_id) DO NOTHING`,
            args: [
                groupId,
                raw.eventId,
                raw.deviceId || 'unknown',
                raw.counter ?? 0,
                raw.timestamp ?? Date.now(),
                serializedEvent,
            ],
        });

        if (!parsed) continue;

        const { type, payload, timestamp } = parsed;
        if (!payload) continue;

        switch (type) {
            case 'TRANSACTION_ADDED':
            case 'TRANSACTION_UPDATED': {
                if (!payload.id) break;
                statements.push({
                    sql: `INSERT INTO transactions (
                            group_id, id, account_id, account, amount, date,
                            category, payee, memo, cleared_status, split_id,
                            transfer_hash, hash, external_id, raw_source, data_json, updated_at
                          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                          ON CONFLICT(group_id, id) DO UPDATE SET
                            account_id = excluded.account_id,
                            account = excluded.account,
                            amount = excluded.amount,
                            date = excluded.date,
                            category = excluded.category,
                            payee = excluded.payee,
                            memo = excluded.memo,
                            cleared_status = excluded.cleared_status,
                            split_id = excluded.split_id,
                            transfer_hash = excluded.transfer_hash,
                            hash = excluded.hash,
                            external_id = COALESCE(excluded.external_id, transactions.external_id),
                            raw_source = COALESCE(excluded.raw_source, transactions.raw_source),
                            data_json = excluded.data_json,
                            updated_at = excluded.updated_at`,
                    args: [
                        groupId,
                        String(payload.id),
                        String(payload.accountId ?? ''),
                        String(payload.account ?? ''),
                        Number(payload.amount ?? 0),
                        String(payload.date ?? ''),
                        payload.category ?? null,
                        payload.payee ?? null,
                        payload.memo ?? null,
                        payload.clearedStatus ?? null,
                        payload.splitId ?? null,
                        payload.transferHash ?? null,
                        payload.hash ?? null,
                        payload.externalId ?? null,
                        payload.rawSource ? JSON.stringify(payload.rawSource) : null,
                        JSON.stringify(payload),
                        timestamp,
                    ],
                });
                break;
            }

            case 'TRANSACTION_DELETED': {
                if (!payload.id) break;
                statements.push({
                    sql: `DELETE FROM transactions WHERE group_id = ? AND id = ?`,
                    args: [groupId, String(payload.id)],
                });
                break;
            }

            case 'ACCOUNT_CREATED':
            case 'ACCOUNT_UPDATED': {
                if (!payload.id) break;
                statements.push({
                    sql: `INSERT INTO accounts (
                            group_id, id, name, type, currency, description,
                            "order", hidden, external_id, data_json, updated_at
                          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                          ON CONFLICT(group_id, id) DO UPDATE SET
                            name = excluded.name,
                            type = excluded.type,
                            currency = excluded.currency,
                            description = excluded.description,
                            "order" = excluded."order",
                            hidden = excluded.hidden,
                            external_id = COALESCE(excluded.external_id, accounts.external_id),
                            data_json = excluded.data_json,
                            updated_at = excluded.updated_at`,
                    args: [
                        groupId,
                        String(payload.id),
                        String(payload.name ?? ''),
                        String(payload.type ?? 'Bank'),
                        String(payload.currency ?? 'PLN'),
                        payload.description ?? null,
                        Number(payload.order ?? 0),
                        payload.hidden ? 1 : 0,
                        payload.externalId ?? null,
                        JSON.stringify(payload),
                        timestamp,
                    ],
                });
                break;
            }

            case 'ACCOUNT_DELETED': {
                if (!payload.id) break;
                statements.push({
                    sql: `DELETE FROM accounts WHERE group_id = ? AND id = ?`,
                    args: [groupId, String(payload.id)],
                });
                break;
            }

            case 'ACCOUNT_REORDERED': {
                if (Array.isArray(payload)) {
                    for (const item of payload) {
                        if (item && item.accountId !== undefined) {
                            statements.push({
                                sql: `UPDATE accounts SET "order" = ?, updated_at = ? WHERE group_id = ? AND id = ?`,
                                args: [Number(item.order ?? 0), timestamp, groupId, String(item.accountId)],
                            });
                        }
                    }
                }
                break;
            }

            case 'CATEGORY_CREATED':
            case 'CATEGORY_UPDATED': {
                if (!payload.id) break;
                statements.push({
                    sql: `INSERT INTO categories (
                            group_id, id, category, color, "order", data_json, updated_at
                          ) VALUES (?, ?, ?, ?, ?, ?, ?)
                          ON CONFLICT(group_id, id) DO UPDATE SET
                            category = excluded.category,
                            color = excluded.color,
                            "order" = excluded."order",
                            data_json = excluded.data_json,
                            updated_at = excluded.updated_at`,
                    args: [
                        groupId,
                        String(payload.id),
                        String(payload.category ?? ''),
                        payload.color ?? null,
                        Number(payload.order ?? 0),
                        JSON.stringify(payload),
                        timestamp,
                    ],
                });
                break;
            }

            case 'CATEGORY_DELETED': {
                if (!payload.id) break;
                statements.push({
                    sql: `DELETE FROM categories WHERE group_id = ? AND id = ?`,
                    args: [groupId, String(payload.id)],
                });
                break;
            }

            case 'PROJECT_CREATED':
            case 'PROJECT_UPDATED': {
                if (!payload.id) break;
                statements.push({
                    sql: `INSERT INTO projects (
                            group_id, id, project, data_json, updated_at
                          ) VALUES (?, ?, ?, ?, ?)
                          ON CONFLICT(group_id, id) DO UPDATE SET
                            project = excluded.project,
                            data_json = excluded.data_json,
                            updated_at = excluded.updated_at`,
                    args: [
                        groupId,
                        String(payload.id),
                        String(payload.project ?? ''),
                        JSON.stringify(payload),
                        timestamp,
                    ],
                });
                break;
            }

            case 'PROJECT_DELETED': {
                if (!payload.id) break;
                statements.push({
                    sql: `DELETE FROM projects WHERE group_id = ? AND id = ?`,
                    args: [groupId, String(payload.id)],
                });
                break;
            }

            case 'ASSERT_CREATED':
            case 'ASSERT_UPDATED': {
                if (!payload.id) break;
                statements.push({
                    sql: `INSERT INTO asserts (
                            group_id, id, account_id, date, value, data_json, updated_at
                          ) VALUES (?, ?, ?, ?, ?, ?, ?)
                          ON CONFLICT(group_id, id) DO UPDATE SET
                            account_id = excluded.account_id,
                            date = excluded.date,
                            value = excluded.value,
                            data_json = excluded.data_json,
                            updated_at = excluded.updated_at`,
                    args: [
                        groupId,
                        String(payload.id),
                        String(payload.accountId ?? ''),
                        String(payload.date ?? ''),
                        Number(payload.value ?? 0),
                        JSON.stringify(payload),
                        timestamp,
                    ],
                });
                break;
            }

            case 'ASSERT_DELETED': {
                if (!payload.id) break;
                statements.push({
                    sql: `DELETE FROM asserts WHERE group_id = ? AND id = ?`,
                    args: [groupId, String(payload.id)],
                });
                break;
            }
        }
    }

    return statements;
}

/**
 * Executes statements in chunks to respect SQLite/LibSQL batch size limits.
 */
export async function executeInChunks(db: Client, statements: InStatement[], chunkSize = 400): Promise<void> {
    for (let i = 0; i < statements.length; i += chunkSize) {
        const chunk = statements.slice(i, i + chunkSize);
        await db.batch(chunk);
    }
}

/**
 * Fetches the materialized state snapshot for a group_id directly from relational tables.
 */
export async function getMaterializedSnapshot(db: Client, groupId: string) {
    const [accRes, txRes, catRes, projRes, assertRes, maxEventRes] = await Promise.all([
        db.execute({ sql: `SELECT data_json, "order" FROM accounts WHERE group_id = ? ORDER BY "order" ASC`, args: [groupId] }),
        db.execute({ sql: `SELECT data_json FROM transactions WHERE group_id = ? ORDER BY date DESC`, args: [groupId] }),
        db.execute({ sql: `SELECT data_json FROM categories WHERE group_id = ? ORDER BY "order" ASC`, args: [groupId] }),
        db.execute({ sql: `SELECT data_json FROM projects WHERE group_id = ?`, args: [groupId] }),
        db.execute({ sql: `SELECT data_json FROM asserts WHERE group_id = ? ORDER BY date DESC`, args: [groupId] }),
        db.execute({ sql: `SELECT MAX(timestamp) as max_ts FROM events WHERE group_id = ?`, args: [groupId] }),
    ]);

    const accounts = accRes.rows.map((r: any) => {
        const parsed = JSON.parse(r.data_json as string);
        if (r.order !== null && r.order !== undefined) parsed.order = Number(r.order);
        return parsed;
    });
    const transactions = txRes.rows.map((r: any) => JSON.parse(r.data_json as string));
    const categories = catRes.rows.map((r: any) => JSON.parse(r.data_json as string));
    const projects = projRes.rows.map((r: any) => JSON.parse(r.data_json as string));
    const asserts = assertRes.rows.map((r: any) => JSON.parse(r.data_json as string));
    const timestamp = Number(maxEventRes.rows[0]?.max_ts || 0);

    return {
        accounts,
        transactions,
        categories,
        projects,
        asserts,
        timestamp,
    };
}

function hashEntityId(id: string): string {
    return crypto.createHash('sha256').update(String(id)).digest('hex').substring(0, 16);
}

/**
 * Imports a full JSON backup ({ accounts, transactions, categories, projects, asserts })
 * into both the `events` log and the materialized relational tables for `groupId`.
 */
export async function importBackupToGroup(
    db: Client,
    groupId: string,
    backup: {
        accounts?: any[];
        transactions?: any[];
        categories?: any[];
        projects?: any[];
        asserts?: any[];
    },
    deviceId = 'backup-import'
): Promise<{ eventsCount: number }> {
    const events: ParsedSyncEvent[] = [];
    const timestamp = Date.now();
    let counter = 1;

    for (const item of backup.accounts || []) {
        events.push({
            eventId: `${deviceId}:migration:acc:${hashEntityId(item.id)}`,
            deviceId,
            counter: counter++,
            timestamp,
            type: 'ACCOUNT_CREATED',
            payload: item,
        });
    }

    for (const item of backup.transactions || []) {
        events.push({
            eventId: `${deviceId}:migration:tx:${hashEntityId(item.id)}`,
            deviceId,
            counter: counter++,
            timestamp,
            type: 'TRANSACTION_ADDED',
            payload: item,
        });
    }

    for (const item of backup.categories || []) {
        events.push({
            eventId: `${deviceId}:migration:cat:${hashEntityId(item.id)}`,
            deviceId,
            counter: counter++,
            timestamp,
            type: 'CATEGORY_CREATED',
            payload: item,
        });
    }

    for (const item of backup.projects || []) {
        events.push({
            eventId: `${deviceId}:migration:proj:${hashEntityId(item.id)}`,
            deviceId,
            counter: counter++,
            timestamp,
            type: 'PROJECT_CREATED',
            payload: item,
        });
    }

    for (const item of backup.asserts || []) {
        events.push({
            eventId: `${deviceId}:migration:assert:${hashEntityId(item.id)}`,
            deviceId,
            counter: counter++,
            timestamp,
            type: 'ASSERT_CREATED',
            payload: item,
        });
    }

    const statements = buildEventMaterializeStatements(groupId, events);
    await executeInChunks(db, statements);

    return { eventsCount: events.length };
}
