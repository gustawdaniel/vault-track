import redisDriver from 'unstorage/drivers/redis';
import fsDriver from 'unstorage/drivers/fs';
import { NitroApp } from 'nitropack';

export default defineNitroPlugin((nitroApp: NitroApp) => {
    const redisUrl = process.env.REDIS_URL || process.env.KV_URL;

    // Use Redis in production if URL is available
    if (process.env.NODE_ENV === 'production' && redisUrl) {
        try {
            nitroApp.storage.mount('sync', redisDriver({
                url: redisUrl
            }));
            console.log('[Storage] Mounted Redis driver for sync');
        } catch (e) {
            console.error('[Storage] Failed to mount Redis driver:', e);
        }
    } else {
        // Fallback to FS in development or if no Redis URL
        nitroApp.storage.mount('sync', fsDriver({
            base: '.data/sync'
        }));
        console.log('[Storage] Mounted FS driver for sync');
    }
});
