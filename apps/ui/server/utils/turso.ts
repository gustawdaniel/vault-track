import { createClient } from '@libsql/client';

export const useTurso = () => {
    const config = useRuntimeConfig();

    if (!config.tursoDatabaseUrl) {
        throw new Error('Missing TURSO_DATABASE_URL');
    }

    if (!config.tursoDatabaseUrl.startsWith('file:') && !config.tursoAuthToken) {
        throw new Error('Missing TURSO_AUTH_TOKEN');
    }

    const client = createClient({
        url: config.tursoDatabaseUrl,
        authToken: config.tursoAuthToken,
    });

    return client;
};

export const initTursoSchema = async () => {
    const client = useTurso();

    await client.execute(`
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id TEXT NOT NULL,
            event_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            counter INTEGER NOT NULL,
            timestamp INTEGER NOT NULL,
            payload TEXT NOT NULL,
            created_at INTEGER DEFAULT (unixepoch())
        );
    `);

    await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_events_sync 
        ON events(group_id, timestamp);
    `);

    await client.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_events_unique 
        ON events(group_id, event_id);
    `);
};
