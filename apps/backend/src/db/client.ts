import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient({
    url,
    authToken: url.startsWith('file:') ? undefined : authToken,
});

// Schema helper
export async function initDB() {
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
