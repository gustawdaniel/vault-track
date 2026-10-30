import { EventEmitter } from 'events';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db, initDB } from '../../db/client';
import {
    buildEventMaterializeStatements,
    executeInChunks,
    filterNewEvents,
    getMaterializedSnapshot,
    importBackupToGroup,
} from './materializer';

// Notify long-polling `/pull` requests when a client pushes new events.
const syncEventEmitter = new EventEmitter();
syncEventEmitter.setMaxListeners(1000);

export async function syncRoutes(fastify: FastifyInstance) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    try {
        await initDB();
    } catch (e) {
        console.error('Failed to init sync tables:', e);
    }

    /**
     * Supports both clients:
     * - cursor-based (legacy Nuxt UI): rowid > cursor
     * - timestamp-based (Svelte cockpit): timestamp >= since
     */
    const getEvents = async (groupId: string, cursor: number, since: number) => {
        const result = cursor > 0
            ? await db.execute({
                sql: `SELECT rowid as id, event_id, device_id, counter, timestamp, payload FROM events
                      WHERE group_id = ? AND rowid > ?
                      ORDER BY rowid ASC
                      LIMIT 2000`,
                args: [groupId, cursor],
            })
            : await db.execute({
                sql: `SELECT rowid as id, event_id, device_id, counter, timestamp, payload FROM events
                      WHERE group_id = ? AND timestamp >= ?
                      ORDER BY timestamp ASC, counter ASC
                      LIMIT 2000`,
                args: [groupId, since],
            });

        return result.rows
            .filter((row: any) =>
                typeof row.payload === 'string' && row.payload.trim().startsWith('{'),
            )
            .map((row: any) => ({
                serverRowId: Number(row.id),
                eventId: row.event_id as string,
                deviceId: row.device_id as string,
                counter: Number(row.counter ?? 0),
                timestamp: Number(row.timestamp),
                payload: row.payload as string,
            }));
    };

    // Pull events (plaintext JSON).
    app.get(
        '/pull',
        {
            schema: {
                querystring: z.object({
                    cursor: z.coerce.number().default(0),
                    since: z.coerce.number().default(0),
                    wait: z.coerce.boolean().optional(),
                }),
                response: {
                    200: z.object({
                        events: z.array(z.object({
                            serverRowId: z.number(),
                            eventId: z.string(),
                            deviceId: z.string(),
                            counter: z.number(),
                            timestamp: z.number(),
                            payload: z.string(),
                        })),
                    }),
                    400: z.object({ error: z.string() }),
                    500: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const groupId = req.headers['x-sync-group-id'] as string;
            if (!groupId) {
                return reply.code(400).send({ error: 'Missing X-Sync-Group-ID header' });
            }

            const { cursor, since, wait } = req.query as {
                cursor: number;
                since: number;
                wait?: boolean;
            };
            const TIMEOUT = 30000;

            if (!wait) {
                try {
                    return { events: await getEvents(groupId, cursor, since) };
                } catch (e: any) {
                    console.error('Sync pull error:', e);
                    return reply.code(500).send({ error: 'Database error: ' + e.message });
                }
            }

            // Long poll. Subscribe before querying so a push landing between the query and the
            // subscription still wakes us, and only ever detach our own listener - other clients
            // of the same group are waiting on the same event name.
            const eventName = `push:${groupId}`;
            let wake!: () => void;
            const woken = new Promise<void>((resolve) => { wake = resolve; });
            syncEventEmitter.once(eventName, wake);
            const timeoutId = setTimeout(wake, TIMEOUT);
            // Client went away (tab closed, request aborted) - stop waiting.
            reply.raw.once('close', wake);

            try {
                let events = await getEvents(groupId, cursor, since);
                if (events.length === 0) {
                    await woken;
                    events = await getEvents(groupId, cursor, since);
                }
                return { events };
            } catch (e: any) {
                console.error('Sync pull error:', e);
                return reply.code(500).send({ error: 'Database error: ' + e.message });
            } finally {
                clearTimeout(timeoutId);
                syncEventEmitter.off(eventName, wake);
                reply.raw.off('close', wake);
            }
        },
    );

    // Every event of one entity (a transaction, an account...), oldest first: who made it and what changed, for the
    // details view of the app.
    app.get(
        '/history',
        {
            schema: {
                querystring: z.object({ id: z.string().min(1) }),
                response: {
                    200: z.object({
                        events: z.array(z.object({
                            eventId: z.string(),
                            deviceId: z.string(),
                            timestamp: z.number(),
                            type: z.string(),
                            payload: z.any(),
                        })),
                    }),
                    400: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const groupId = req.headers['x-sync-group-id'] as string;
            if (!groupId) return reply.code(400).send({ error: 'Missing X-Sync-Group-ID header' });
            const result = await db.execute({
                sql: `SELECT event_id, device_id, timestamp, payload FROM events
                      WHERE group_id = ? AND json_valid(payload) AND json_extract(payload, '$.payload.id') = ?
                      ORDER BY timestamp ASC, counter ASC`,
                args: [groupId, req.query.id],
            });
            return {
                events: result.rows.map((row: any) => {
                    const event = JSON.parse(String(row.payload));
                    return {
                        eventId: String(row.event_id),
                        deviceId: String(row.device_id),
                        timestamp: Number(row.timestamp),
                        type: String(event.type ?? ''),
                        payload: event.payload ?? null,
                    };
                }),
            };
        },
    );

    // Push events. Writes the event log and materializes relational SQL tables.
    app.post(
        '/push',
        {
            schema: {
                body: z.object({
                    events: z.array(z.object({
                        eventId: z.string(),
                        deviceId: z.string(),
                        counter: z.number(),
                        timestamp: z.number(),
                        type: z.string().optional(),
                        payload: z.any(),
                    })),
                }),
                response: {
                    200: z.object({ success: z.boolean(), count: z.number() }),
                    400: z.object({ error: z.string() }),
                    500: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const groupId = req.headers['x-sync-group-id'] as string;
            if (!groupId) {
                return reply.code(400).send({ error: 'Missing X-Sync-Group-ID header' });
            }

            const { events } = req.body as { events: any[] };
            if (events.length === 0) {
                return { success: true, count: 0 };
            }

            try {
                const freshEvents = await filterNewEvents(db, groupId, events as any);
                if (freshEvents.length === 0) {
                    return { success: true, count: 0 };
                }
                const statements = buildEventMaterializeStatements(groupId, freshEvents);
                await executeInChunks(db, statements);
                syncEventEmitter.emit(`push:${groupId}`);
                return { success: true, count: freshEvents.length };
            } catch (e: any) {
                console.error('Sync push error:', e);
                return reply.code(500).send({ error: 'Database error: ' + e.message });
            }
        },
    );

    // Materialized snapshot for fast bootstrap on a new device.
    app.get(
        '/snapshot',
        {
            schema: {
                response: {
                    200: z.object({
                        accounts: z.array(z.any()),
                        transactions: z.array(z.any()),
                        categories: z.array(z.any()),
                        projects: z.array(z.any()),
                        asserts: z.array(z.any()),
                        timestamp: z.number(),
                    }),
                    400: z.object({ error: z.string() }),
                    500: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const groupId = req.headers['x-sync-group-id'] as string;
            if (!groupId) {
                return reply.code(400).send({ error: 'Missing X-Sync-Group-ID header' });
            }

            try {
                return await getMaterializedSnapshot(db, groupId);
            } catch (e: any) {
                console.error('Snapshot fetch error:', e);
                return reply.code(500).send({ error: 'Database error: ' + e.message });
            }
        },
    );

    // Import a full JSON backup into events + relational tables.
    app.post(
        '/import-backup',
        {
            schema: {
                body: z.object({
                    accounts: z.array(z.any()).optional(),
                    transactions: z.array(z.any()).optional(),
                    categories: z.array(z.any()).optional(),
                    projects: z.array(z.any()).optional(),
                    asserts: z.array(z.any()).optional(),
                }),
                response: {
                    200: z.object({ success: z.boolean(), eventsCount: z.number() }),
                    400: z.object({ error: z.string() }),
                    500: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const groupId = req.headers['x-sync-group-id'] as string;
            if (!groupId) {
                return reply.code(400).send({ error: 'Missing X-Sync-Group-ID header' });
            }

            try {
                const result = await importBackupToGroup(db, groupId, req.body as any);
                return { success: true, eventsCount: result.eventsCount };
            } catch (e: any) {
                console.error('Import backup error:', e);
                return reply.code(500).send({ error: 'Database error: ' + e.message });
            }
        },
    );

    // Delete all events for a group (nuclear reset).
    app.delete(
        '/events',
        {
            schema: {
                response: {
                    200: z.object({ success: z.boolean(), deleted: z.number() }),
                    400: z.object({ error: z.string() }),
                    500: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const groupId = req.headers['x-sync-group-id'] as string;
            if (!groupId) {
                return reply.code(400).send({ error: 'Missing X-Sync-Group-ID header' });
            }

            try {
                const result = await db.execute({
                    sql: `DELETE FROM events WHERE group_id = ?`,
                    args: [groupId],
                });
                const deleted = Number(result.rowsAffected ?? 0);
                console.log(`[Sync] Deleted ${deleted} events for group ${groupId.substring(0, 16)}...`);
                return { success: true, deleted };
            } catch (e: any) {
                console.error('Sync delete error:', e);
                return reply.code(500).send({ error: 'Database error: ' + e.message });
            }
        },
    );
}
