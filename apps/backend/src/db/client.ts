import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient({
    url,
    authToken: url.startsWith('file:') ? undefined : authToken,
});

// Schema helper
export async function initDB() {
    if (url.startsWith('file:') && url !== 'file::memory:') {
        await db.execute('PRAGMA journal_mode = WAL;');
        await db.execute('PRAGMA synchronous = NORMAL;');
    }

    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            credits INTEGER DEFAULT 0,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS exchange_rates (
            date TEXT NOT NULL,
            currency TEXT NOT NULL,
            rate REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (date, currency)
        );
    `);

    await db.execute(`
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

    await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_events_sync
        ON events(group_id, timestamp);
    `);

    await db.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_events_unique
        ON events(group_id, event_id);
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS accounts (
            group_id TEXT NOT NULL,
            id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            currency TEXT NOT NULL,
            description TEXT,
            "order" INTEGER DEFAULT 0,
            hidden INTEGER DEFAULT 0,
            external_id TEXT,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (group_id, id)
        );
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS transactions (
            group_id TEXT NOT NULL,
            id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            account TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            category TEXT,
            payee TEXT,
            memo TEXT,
            cleared_status TEXT,
            split_id TEXT,
            transfer_hash TEXT,
            hash TEXT,
            external_id TEXT,
            raw_source TEXT,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (group_id, id)
        );
    `);

    await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_transactions_group_date ON transactions(group_id, date);
    `);
    await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_transactions_group_account ON transactions(group_id, account_id);
    `);
    await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_transactions_group_hash ON transactions(group_id, hash);
    `);
    await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_transactions_group_external ON transactions(group_id, external_id);
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS connector_runs (
            id TEXT PRIMARY KEY,
            group_id TEXT NOT NULL,
            source TEXT NOT NULL,
            started_at INTEGER NOT NULL,
            finished_at INTEGER,
            status TEXT NOT NULL,
            imported INTEGER DEFAULT 0,
            skipped INTEGER DEFAULT 0,
            error TEXT,
            details_json TEXT
        );
    `);

    await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_connector_runs_group_source
            ON connector_runs(group_id, source, started_at DESC);
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS connector_links (
            id TEXT PRIMARY KEY,
            group_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            aspsp_name TEXT,
            state TEXT,
            session_id TEXT,
            provider_account_id TEXT,
            provider_accounts_json TEXT,
            vaulttrack_account_id TEXT,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            expires_at INTEGER,
            last_sync_at INTEGER,
            error TEXT
        );
    `);

    await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_connector_links_group
            ON connector_links(group_id, provider, created_at DESC);
    `);
    await db.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_connector_links_state
            ON connector_links(state);
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS categories (
            group_id TEXT NOT NULL,
            id TEXT NOT NULL,
            category TEXT NOT NULL,
            color TEXT,
            "order" INTEGER DEFAULT 0,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (group_id, id)
        );
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS projects (
            group_id TEXT NOT NULL,
            id TEXT NOT NULL,
            project TEXT NOT NULL,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (group_id, id)
        );
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS asserts (
            group_id TEXT NOT NULL,
            id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            date TEXT NOT NULL,
            value REAL NOT NULL,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (group_id, id)
        );
    `);
}

export const UserSchema = z.object({
    id: z.string(),
    credits: z.number(),
    email: z.string().nullable(),
    created_at: z.string().optional(),
});

export const ExchangeRateSchema = z.object({
    date: z.string(),
    currency: z.string(),
    rate: z.number(),
    created_at: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;
export type ExchangeRate = z.infer<typeof ExchangeRateSchema>;
