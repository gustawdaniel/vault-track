import { defineEventHandler, getQuery, getHeader, createError } from 'h3';
import { useTurso } from '~/server/utils/turso';
import type { TransportEvent } from '~/sync/types';

export default defineEventHandler(async (event) => {
    const groupId = getHeader(event, 'X-Sync-Group-ID');
    if (!groupId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing X-Sync-Group-ID header' });
    }

    const query = getQuery(event);
    const since = Number(query.since) || 0;
    const shouldWait = query.wait === 'true';
    const client = useTurso();

    const startTime = Date.now();
    const TIMEOUT = 5000; // 5s timeout

    while (true) {
        try {
            const result = await client.execute({
                sql: `SELECT event_id, device_id, counter, timestamp, payload FROM events 
                      WHERE group_id = ? AND timestamp > ? 
                      ORDER BY timestamp ASC, counter ASC 
                      LIMIT 2000`,
                args: [groupId, since]
            });

            if (result.rows.length > 0) {
                // Build TransportEvent objects with raw encrypted payloads
                const events: TransportEvent[] = result.rows.map(row => ({
                    eventId: row.event_id as string,
                    deviceId: row.device_id as string,
                    counter: row.counter as number,
                    timestamp: row.timestamp as number,
                    payload: row.payload as string // Raw encrypted string
                }));
                return { events };
            }
        } catch (e: any) {
            console.error('Turso pull error:', e);
            throw createError({ statusCode: 500, statusMessage: 'Database error', message: e.message });
        }

        if (!shouldWait || (Date.now() - startTime > TIMEOUT)) {
            return { events: [] };
        }

        // Wait 1s and retry (efficient polling)
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
});
