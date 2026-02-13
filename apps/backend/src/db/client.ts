import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) throw new Error('TURSO_DATABASE_URL is not set');

export const db = createClient({
    url,
    authToken,
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
}

export const UserSchema = z.object({
    id: z.string(),
    credits: z.number(),
    email: z.string().nullable(),
    created_at: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;
