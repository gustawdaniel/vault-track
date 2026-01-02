import { defineEventHandler, getQuery, getHeader, createError } from 'h3';
import type { BaseEvent } from '~/sync/types';

export default defineEventHandler(async (event) => {
    const groupId = getHeader(event, 'X-Sync-Group-ID');
    if (!groupId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing X-Sync-Group-ID header' });
    }

    const query = getQuery(event);
    const since = Number(query.since) || 0;
    const storage = useStorage('sync');

    // Long Polling Logic
    const shouldWait = query.wait === 'true';
    const startTime = Date.now();
    const TIMEOUT = 25000; // 25s timeout (vercel usually 10s-60s, keeping it safe)

    while (true) {
        // Prefix scan using storage keys.
        // Ideally unstorage driver dependent, but for FS/Redis this works.
        const keys = await storage.getKeys(`events:${groupId}`);

        const relevantKeys = keys.filter(key => {
            // key: events:<groupId>:<timestamp>:...
            const parts = key.split(':');
            const timestamp = Number(parts[2]);
            return timestamp > since;
        });

        if (relevantKeys.length > 0) {
            const events: BaseEvent[] = [];
            for (const key of relevantKeys) {
                const item = await storage.getItem<BaseEvent>(key);
                if (item) {
                    events.push(item);
                }
            }

            // Sort by timestamp, then deviceId, then counter
            events.sort((a: BaseEvent, b: BaseEvent) => {
                if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
                if (a.deviceId !== b.deviceId) return a.deviceId.localeCompare(b.deviceId);
                return a.counter - b.counter;
            });

            return { events };
        }

        if (!shouldWait) {
            return { events: [] };
        }

        if (Date.now() - startTime > TIMEOUT) {
            return { events: [] };
        }

        // Wait 1s before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
});
