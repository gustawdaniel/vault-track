import { defineEventHandler, readBody, getHeader, createError } from 'h3';

export default defineEventHandler(async (event) => {
    const groupId = getHeader(event, 'X-Sync-Group-ID');
    if (!groupId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing X-Sync-Group-ID header' });
    }

    const body = await readBody(event);
    const events = body.events || [];
    const storage = useStorage('sync');

    let count = 0;
    for (const e of events) {
        // Key format: events:<groupId>:<timestamp>:<deviceId>:<counter>:<eventId>
        // Padding timestamp ensures correct ASCII sorting
        const paddedTimestamp = String(e.timestamp).padStart(20, '0');
        const key = `events:${groupId}:${paddedTimestamp}:${e.deviceId}:${e.counter}:${e.eventId}`;

        // Idempotency: don't overwrite if exists (though append-only usually implies new keys)
        if (!await storage.hasItem(key)) {
            await storage.setItem(key, e);
            count++;
        }
    }

    return { success: true, count };
});
