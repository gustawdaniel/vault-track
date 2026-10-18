import { EventEmitter } from 'events';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db, initDB } from '../../db/client';
import {
    buildEventMaterializeStatements,
    executeInChunks,
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

            try {
                let events = await getEvents(groupId, cursor, since);
                if (events.length > 0) {
                    return { events };
                }
                if (!wait) {
                    return { events: [] };
                }

                const eventName = `push:${groupId}`;
                let timeoutId: NodeJS.Timeout;
                const timeoutPromise = new Promise<'timeout'>((resolve) => {
                    timeoutId = setTimeout(() => resolve('timeout'), TIMEOUT);
                });
                const pushPromise = new Promise<'push'>((resolve) => {
                    syncEventEmitter.once(eventName, () => resolve('push'));
                });

                const winner = await Promise.race([pushPromise, timeoutPromise]);
                clearTimeout(timeoutId!);

                if (winner === 'timeout') {
                    syncEventEmitter.removeAllListeners(eventName);
                } else {
                    events = await getEvents(groupId, cursor, since);
                }

                return { events };
            } catch (e: any) {
                console.error('Sync pull error:', e);
                return reply.code(500).send({ error: 'Database error: ' + e.message });
            }
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
                const statements = buildEventMaterializeStatements(groupId, events);
                await executeInChunks(db, statements);
                syncEventEmitter.emit(`push:${groupId}`);
                return { success: true, count: events.length };
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
