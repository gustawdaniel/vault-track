import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, Client } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import {
    buildEventMaterializeStatements,
    executeInChunks,
    getMaterializedSnapshot,
    importBackupToGroup,
} from './materializer';

describe('Backend Plaintext Sync & Relational Materializer', () => {
    let testDb: Client;
    const dbPath = path.join('/tmp', `vaulttrack-test-${Date.now()}.db`);
    const groupId = 'test-group-12-words-hash';

    beforeAll(async () => {
        testDb = createClient({ url: `file:${dbPath}` });

        await testDb.execute(`
            CREATE TABLE IF NOT EXISTS events (
                group_id TEXT NOT NULL,
                event_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                counter INTEGER,
                timestamp INTEGER NOT NULL,
                payload TEXT NOT NULL,
                created_at INTEGER DEFAULT (unixepoch('now')),
                PRIMARY KEY (group_id, event_id)
            );
        `);
        await testDb.execute(`
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
        await testDb.execute(`
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
                executed_at TEXT,
                executed_at_precision TEXT,
                executed_at_source TEXT,
                booking_date TEXT,
                PRIMARY KEY (group_id, id)
            );
        `);
        await testDb.execute(`
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
        await testDb.execute(`
            CREATE TABLE IF NOT EXISTS projects (
                group_id TEXT NOT NULL,
                id TEXT NOT NULL,
                project TEXT NOT NULL,
                data_json TEXT NOT NULL,
                updated_at INTEGER NOT NULL,
                PRIMARY KEY (group_id, id)
            );
        `);
        await testDb.execute(`
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
    });

    afterAll(() => {
        testDb.close();
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
    });

    it('imports a synthetic backup into relational tables and the events log', async () => {
        const backup = {
            accounts: [
                { id: 'acc-pln', name: 'Konto testowe PLN', type: 'Bank', currency: 'PLN' },
                { id: 'acc-eur', name: 'Konto testowe EUR', type: 'Bank', currency: 'EUR' },
            ],
            transactions: [
                { id: 'tx-1', accountId: 'acc-pln', account: 'Konto testowe PLN', amount: 100, date: '2026-10-01', payee: 'Sklep testowy', category: 'Zakupy' },
                { id: 'tx-2', accountId: 'acc-pln', account: 'Konto testowe PLN', amount: -25.5, date: '2026-10-02', payee: 'Kawiarnia testowa', category: 'Jedzenie' },
                { id: 'tx-3', accountId: 'acc-eur', account: 'Konto testowe EUR', amount: 50, date: '2026-10-03', payee: 'Przelew testowy', category: 'Inne' },
            ],
            categories: [
                { id: 'cat-1', category: 'Zakupy' },
                { id: 'cat-2', category: 'Jedzenie' },
            ],
            projects: [
                { id: 'proj-1', project: 'Projekt testowy' },
            ],
            asserts: [
                { id: 'assert-1', accountId: 'acc-pln', date: '2026-10-31', value: 74.5 },
            ],
        };

        const result = await importBackupToGroup(testDb, groupId, backup);
        expect(result.eventsCount).toBe(9);

        const snapshot = await getMaterializedSnapshot(testDb, groupId);
        expect(snapshot.accounts).toHaveLength(2);
        expect(snapshot.transactions).toHaveLength(3);
        expect(snapshot.categories).toHaveLength(2);
        expect(snapshot.projects).toHaveLength(1);
        expect(snapshot.asserts).toHaveLength(1);

        // Verify direct SQL query works for MCP / Connectors
        const sqlRes = await testDb.execute({
            sql: `SELECT account, COUNT(*) as tx_count, ROUND(SUM(amount), 2) as balance
                  FROM transactions
                  WHERE group_id = ?
                  GROUP BY account
                  ORDER BY tx_count DESC`,
            args: [groupId],
        });
        expect(sqlRes.rows).toHaveLength(2);
        expect(Number(sqlRes.rows[0]?.tx_count)).toBe(2);
        expect(Number(sqlRes.rows[0]?.balance)).toBe(74.5);
    });

    it('should materialize incremental add/update/delete events into relational tables', async () => {
        const now = Date.now();
        const addTxEvent = {
            eventId: 'mcp:1:newtx',
            deviceId: 'mcp',
            counter: 1,
            timestamp: now,
            type: 'TRANSACTION_ADDED',
            payload: {
                id: 'tx-mcp-test-1',
                account: 'Wise Eur',
                accountId: 'acc-wise-eur',
                amount: -42.5,
                date: '2026-10-17',
                category: 'Jedzenie:Restauracje',
                payee: 'Bolt Food',
                externalId: 'wise-ext-999',
            },
        };

        await executeInChunks(
            testDb,
            buildEventMaterializeStatements(groupId, [
                {
                    ...addTxEvent,
                    payload: JSON.stringify(addTxEvent),
                },
            ])
        );

        const checkAdded = await testDb.execute({
            sql: `SELECT payee, amount, external_id FROM transactions WHERE group_id = ? AND id = ?`,
            args: [groupId, 'tx-mcp-test-1'],
        });
        expect(checkAdded.rows).toHaveLength(1);
        expect(checkAdded.rows[0]?.payee).toBe('Bolt Food');
        expect(Number(checkAdded.rows[0]?.amount)).toBe(-42.5);
        expect(checkAdded.rows[0]?.external_id).toBe('wise-ext-999');

        // Delete event
        const delTxEvent = {
            eventId: 'mcp:2:deltx',
            deviceId: 'mcp',
            counter: 2,
            timestamp: now + 1,
            type: 'TRANSACTION_DELETED',
            payload: { id: 'tx-mcp-test-1' },
        };

        await executeInChunks(
            testDb,
            buildEventMaterializeStatements(groupId, [
                {
                    ...delTxEvent,
                    payload: JSON.stringify(delTxEvent),
                },
            ])
        );

        const checkDeleted = await testDb.execute({
            sql: `SELECT id FROM transactions WHERE group_id = ? AND id = ?`,
            args: [groupId, 'tx-mcp-test-1'],
        });
        expect(checkDeleted.rows).toHaveLength(0);
    });
});
