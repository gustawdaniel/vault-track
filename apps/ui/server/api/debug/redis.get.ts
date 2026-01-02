import { defineEventHandler } from 'h3';
import Redis from 'ioredis';

export default defineEventHandler(async () => {
    const url = process.env.REDIS_URL || process.env.KV_URL;
    if (!url) {
        return { status: 'error', message: 'No REDIS_URL or KV_URL found' };
    }

    // Mask the password for safety
    const maskedUrl = url.replace(/:([^@]+)@/, ':***@');

    try {
        const redis = new Redis(url, {
            // fast fail
            connectTimeout: 3000,
            maxRetriesPerRequest: 1
        });

        await redis.ping();
        await redis.quit();

        return { status: 'ok', url: maskedUrl, message: 'Connected successfully' };
    } catch (e: any) {
        return {
            status: 'error',
            url: maskedUrl,
            error: e.message,
            stack: e.stack,
            code: e.code
        };
    }
});
