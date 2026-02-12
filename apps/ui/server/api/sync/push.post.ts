import { defineEventHandler, readBody, getHeader, createError } from 'h3';
import type { TransportEvent } from '~/sync/types';
import { useTurso, initTursoSchema } from '~/server/utils/turso';

let schemaInitialized = false;

export default defineEventHandler(async (event) => {
    const groupId = getHeader(event, 'X-Sync-Group-ID');
    if (!groupId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing X-Sync-Group-ID header' });
    }

    if (!schemaInitialized) {
        try {
            await initTursoSchema();
            schemaInitialized = true;
        } catch (e) {
            console.error('Failed to init Turso schema:', e);
            // Continue; maybe it already exists or we want to fail on insert
        }
    }

    const body = await readBody(event);
    const events: TransportEvent[] = body.events || [];
    const client = useTurso();

    if (events.length === 0) {
        return { success: true, count: 0 };
    }

    // SQLite max variables is usually 999 or 32766 depending on version. 
    // We insert 7 params per row. 50 * 7 = 350, safe.
    // Batch insert using a transaction or multiple insert statements. 
    // LibSQL supports batch execution.

    // We'll trust the client batching but for SQL we can construct a large INSERT or simpler loop.
    // A loop of INSERTs is fine for 50 items with an HTTP-based DB like Turso if we parallelize or use their batch API.
    // However, LibSQL/Turso `batch()` is transaction-based.

    const statements = events.map(e => ({
        sql: `INSERT INTO events (group_id, event_id, device_id, counter, timestamp, payload) 
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(group_id, event_id) DO NOTHING`,
        args: [
            groupId,
            e.eventId,
            e.deviceId,
            e.counter,
            e.timestamp,
            e.payload // Store raw encrypted string
        ]
    }));

    // Execute in batches of 20 to avoid payload limits if necessary, though 50 is likely fine.
    try {
        await client.batch(statements, 'write');
    } catch (e: any) {
        console.error('Turso batch insert error:', e);
        throw createError({ statusCode: 500, statusMessage: 'Database error', message: e.message });
    }

    return { success: true, count: events.length };
});
