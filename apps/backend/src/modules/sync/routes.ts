import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db } from '../../db/client';

// Define TransportEvent type locally to match what client expects
interface TransportEvent {
    eventId: string;
    deviceId: string;
    counter: number;
    timestamp: number;
    payload: string;
}

export async function syncRoutes(fastify: FastifyInstance) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // Init schema if needed (simple check)
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS events (
                group_id TEXT NOT NULL,
                event_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                counter INTEGER,
                timestamp INTEGER NOT NULL,
                payload TEXT NOT NULL,
                created_at INTEGER DEFAULT (unixepoch('now')),
                PRIMARY KEY (group_id, event_id)
            );
        `);
        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_events_group_time ON events(group_id, timestamp);
        `);
    } catch (e) {
        console.error('Failed to init sync table:', e);
    }

    // Pull events
    app.get(
        '/pull',
        {
            schema: {
                querystring: z.object({
                    since: z.coerce.number().default(0),
                    wait: z.coerce.boolean().optional(),
                }),
                response: {
                    200: z.object({
                        events: z.array(z.object({
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

            const { since, wait } = req.query as { since: number; wait?: boolean };
            const startTime = Date.now();
            const TIMEOUT = 5000; // 5s long polling

            // Polling loop
            while (true) {
                try {
                    const result = await db.execute({
                        sql: `SELECT event_id, device_id, counter, timestamp, payload FROM events 
                              WHERE group_id = ? AND timestamp > ? 
                              ORDER BY timestamp ASC, counter ASC 
                              LIMIT 2000`,
                        args: [groupId, since],
                    });

                    if (result.rows.length > 0) {
                        const events = result.rows.map((row: any) => ({
                            eventId: row.event_id as string,
                            deviceId: row.device_id as string,
                            counter: row.counter as number,
                            timestamp: row.timestamp as number,
                            payload: row.payload as string,
                        }));
                        return { events };
                    }
                } catch (e: any) {
                    console.error('Sync pull error:', e);
                    return reply.code(500).send({ error: 'Database error: ' + e.message });
                }

                if (!wait || (Date.now() - startTime > TIMEOUT)) {
                    return { events: [] };
                }

                // Wait 1s and retry
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    );

    // Push events
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
                        payload: z.string(),
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
                // Batch insert using txn if possible, or simple loop/batch
                // LibSQL/Turso client supports batch
                const statements = events.map((e: any) => ({
                    sql: `INSERT INTO events (group_id, event_id, device_id, counter, timestamp, payload) 
                          VALUES (?, ?, ?, ?, ?, ?)
                          ON CONFLICT(group_id, event_id) DO NOTHING`,
                    args: [
                        groupId,
                        e.eventId,
                        e.deviceId,
                        e.counter,
                        e.timestamp,
                        e.payload,
                    ],
                }));

                // Execute in transaction
                await db.batch(statements);

                return { success: true, count: events.length };
            } catch (e: any) {
                console.error('Sync push error:', e);
                return reply.code(500).send({ error: 'Database error: ' + e.message });
            }
        }
    );
}
