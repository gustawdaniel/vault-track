import { defineEventHandler, readBody, getHeader, createError } from 'h3';
import type { AppEvent } from '~/sync/types';

export default defineEventHandler(async (event) => {
    const groupId = getHeader(event, 'X-Sync-Group-ID');
    if (!groupId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing X-Sync-Group-ID header' });
    }

    const body = await readBody(event);
    const events: AppEvent[] = body.events || [];
    const storage = useStorage('sync');

    // Process in chunks to avoid overwhelming the storage driver/network limits
    const CHUNK_SIZE = 50;
    let count = 0;

    for (let i = 0; i < events.length; i += CHUNK_SIZE) {
        const chunk = events.slice(i, i + CHUNK_SIZE);

        // Prepare keys for the chunk
        const items = chunk.map(e => {
            const paddedTimestamp = String(e.timestamp).padStart(20, '0');
            const key = `events:${groupId}:${paddedTimestamp}:${e.deviceId}:${e.counter}:${e.eventId}`;
            return { key, event: e };
        });

        // Check existence in parallel
        const existenceResults = await Promise.all(items.map(item => storage.hasItem(item.key)));

        // Filter items that need to be stored
        const toStore = items.filter((_, index) => !existenceResults[index]);

        // Store in parallel
        if (toStore.length > 0) {
            await Promise.all(toStore.map(item => storage.setItem(item.key, item.event)));
            count += toStore.length;
        }
    }

    return { success: true, count };
});
