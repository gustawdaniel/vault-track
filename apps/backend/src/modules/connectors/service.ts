import crypto from 'node:crypto';
import { Client, InStatement } from '@libsql/client';
import { buildEventMaterializeStatements, executeInChunks } from '../sync/materializer';

export interface ConnectorTransactionInput {
    /** Stable identifier from the bank/connector. If omitted, a content fingerprint is used. */
    externalId?: string;
    date: string;
    amount: number;
    payee?: string;
    memo?: string;
    category?: string;
    currency?: string;
    balance?: number;
    clearedStatus?: '' | '*' | 'X' | '?';
    raw?: Record<string, unknown>;
}

export interface ConnectorAccount {
    id: string;
    name: string;
    currency?: string;
}

export interface IngestResult {
    imported: number;
    skipped: number;
    total: number;
    transactionIds: string[];
}

export function normalizeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function parseAmount(value: unknown): number {
    const text = normalizeText(value).replace(/\s+/g, '').replace(',', '.');
    if (!text) return 0;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Deterministic content fingerprint for sources that do not expose a bank transaction id.
 * `balance` (running balance after the transaction) makes repeated same-day/same-amount
 * rows distinguishable without relying on file order.
 */
export function transactionFingerprint(
    accountId: string,
    tx: ConnectorTransactionInput,
    occurrence = 0,
): string {
    const parts = [
        accountId,
        normalizeText(tx.date),
        Number(tx.amount).toFixed(8),
        normalizeText(tx.currency),
        normalizeText(tx.payee),
        normalizeText(tx.memo),
        tx.balance === undefined || tx.balance === null ? '' : Number(tx.balance).toFixed(8),
        String(occurrence),
    ];
    return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

export function buildExternalId(source: string, accountId: string, tx: ConnectorTransactionInput): string {
    if (tx.externalId && normalizeText(tx.externalId)) {
        return `${source}:id:${normalizeText(tx.externalId)}`;
    }
    return `${source}:fp:${transactionFingerprint(accountId, tx).substring(0, 32)}`;
}

/**
 * 11-character id, matching the shape used by the browser app. Deterministic so that
 * re-importing the same bank row is idempotent.
 */
export function buildTransactionId(externalId: string): string {
    return crypto.createHash('sha256').update(externalId).digest('hex').substring(0, 11);
}

function buildTransactionEvent(
    source: string,
    account: ConnectorAccount,
    tx: ConnectorTransactionInput,
    externalId: string,
    index: number,
) {
    const id = buildTransactionId(externalId);
    return {
        eventId: `connector:${source}:${id}`,
        deviceId: `connector:${source}`,
        counter: index + 1,
        timestamp: Date.now() + index,
        type: 'TRANSACTION_ADDED',
        payload: {
            id,
            accountId: account.id,
            account: account.name,
            amount: tx.amount,
            date: tx.date,
            category: tx.category ?? '',
            payee: tx.payee ?? '',
            memo: tx.memo ?? '',
            clearedStatus: tx.clearedStatus ?? 'X',
            externalId,
            rawSource: {
                connector: source,
                currency: tx.currency,
                balance: tx.balance,
                ...(tx.raw || {}),
            },
        },
    };
}

/**
 * Inserts only transactions whose external id is not already present for the group.
 * All writes go through the same event + materializer path as the browser, so the
 * change is immediately visible to `/api/sync/pull` clients.
 */
export async function ingestTransactions(
    db: Client,
    groupId: string,
    source: string,
    account: ConnectorAccount,
    transactions: ConnectorTransactionInput[],
): Promise<IngestResult> {
    const existing = await db.execute({
        sql: `SELECT external_id FROM transactions
              WHERE group_id = ? AND external_id IS NOT NULL`,
        args: [groupId],
    });
    const existingIds = new Set(
        existing.rows.map((row: any) => String(row.external_id)),
    );

    const batchSeen = new Set<string>();
    const fresh: Array<{ tx: ConnectorTransactionInput; externalId: string }> = [];

    for (const tx of transactions) {
        if (!tx || !normalizeText(tx.date) || !Number.isFinite(Number(tx.amount))) continue;
        const externalId = buildExternalId(source, account.id, tx);
        if (existingIds.has(externalId) || batchSeen.has(externalId)) continue;
        batchSeen.add(externalId);
        fresh.push({ tx, externalId });
    }

    if (fresh.length === 0) {
        return { imported: 0, skipped: transactions.length, total: transactions.length, transactionIds: [] };
    }

    const events = fresh.map(({ tx, externalId }, index) =>
        buildTransactionEvent(source, account, tx, externalId, index),
    );

    const statements = buildEventMaterializeStatements(groupId, events);
    await executeInChunks(db, statements);

    return {
        imported: fresh.length,
        skipped: transactions.length - fresh.length,
        total: transactions.length,
        transactionIds: fresh.map(({ externalId }) => buildTransactionId(externalId)),
    };
}

export interface ConnectorAssertInput {
    accountId: string;
    date: string;
    value: number;
    currency?: string;
}

export async function upsertConnectorAssert(
    db: Client,
    groupId: string,
    source: string,
    input: ConnectorAssertInput,
): Promise<{ id: string; created: boolean }> {
    const id = `connector:${source}:${input.accountId}:${input.date}`;
    const existing = await db.execute({
        sql: `SELECT id FROM asserts WHERE group_id = ? AND id = ? LIMIT 1`,
        args: [groupId, id],
    });
    const created = existing.rows.length === 0;

    const event = {
        eventId: `connector:${source}:assert:${id}`,
        deviceId: `connector:${source}`,
        counter: 1,
        timestamp: Date.now(),
        type: created ? 'ASSERT_CREATED' : 'ASSERT_UPDATED',
        payload: {
            id,
            accountId: input.accountId,
            date: input.date,
            value: input.value,
            updatedAt: new Date().toISOString(),
            source,
        },
    };

    const statements: InStatement[] = buildEventMaterializeStatements(groupId, [event]);
    await executeInChunks(db, statements);

    return { id, created };
}

export interface ConnectorRunInput {
    groupId: string;
    source: string;
    startedAt: number;
    status: 'ok' | 'error';
    imported: number;
    skipped: number;
    error?: string;
    details?: Record<string, unknown>;
}

export async function logConnectorRun(db: Client, input: ConnectorRunInput): Promise<void> {
    await db.execute({
        sql: `INSERT INTO connector_runs (
                id, group_id, source, started_at, finished_at, status,
                imported, skipped, error, details_json
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            crypto.randomUUID(),
            input.groupId,
            input.source,
            input.startedAt,
            Date.now(),
            input.status,
            input.imported,
            input.skipped,
            input.error ?? null,
            input.details ? JSON.stringify(input.details) : null,
        ],
    });
}

export async function getConnectorStatus(db: Client, groupId: string) {
    const result = await db.execute({
        sql: `SELECT source, status, imported, skipped, started_at, finished_at, error
              FROM connector_runs
              WHERE group_id = ?
              ORDER BY started_at DESC
              LIMIT 200`,
        args: [groupId],
    });

    const latest = new Map<string, any>();
    for (const row of result.rows as any[]) {
        const source = String(row.source);
        if (latest.has(source)) continue;
        latest.set(source, {
            source,
            status: row.status,
            imported: Number(row.imported ?? 0),
            skipped: Number(row.skipped ?? 0),
            startedAt: Number(row.started_at),
            finishedAt: row.finished_at === null ? null : Number(row.finished_at),
            error: row.error ?? null,
        });
    }

    return Array.from(latest.values());
}
