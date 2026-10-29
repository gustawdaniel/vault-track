import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import {
    buildExternalId,
    categorizeExisting,
    buildTransactionId,
    ingestTransactions,
    transactionFingerprint,
    upsertConnectorAssert,
} from './service';

describe('connector ingest service', () => {
    let db: Client;
    const dbPath = path.join('/tmp', `vaulttrack-connectors-${Date.now()}.db`);
    const groupId = 'test-group';
    const account = { id: 'millennium-account', name: 'Millennium Bank', currency: 'PLN' };

    beforeAll(async () => {
        db = createClient({ url: `file:${dbPath}` });
        await db.execute(`
            CREATE TABLE events (
                group_id TEXT NOT NULL,
                event_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                counter INTEGER,
                timestamp INTEGER NOT NULL,
                payload TEXT NOT NULL,
                PRIMARY KEY (group_id, event_id)
            );
        `);
        await db.execute(`
            CREATE TABLE accounts (
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
            CREATE TABLE transactions (
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
        await db.execute(`
            CREATE TABLE categories (
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
            CREATE TABLE asserts (
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
        db.close();
        for (const suffix of ['', '-wal', '-shm']) {
            const file = `${dbPath}${suffix}`;
            if (fs.existsSync(file)) fs.unlinkSync(file);
        }
    });

    const batch = [
        {
            date: '2026-10-01',
            amount: -7,
            payee: 'Bank Millennium SA',
            memo: 'Opłata miesięczna',
            currency: 'PLN',
            balance: 4362.4,
        },
        {
            date: '2026-10-02',
            amount: 1250,
            payee: 'Klient',
            memo: 'Faktura 10/2026',
            currency: 'PLN',
            balance: 5612.4,
        },
    ];

    it('computes stable external ids and transaction ids', () => {
        const first = buildExternalId('millennium', account.id, batch[0]!);
        const second = buildExternalId('millennium', account.id, { ...batch[0]! });

        expect(first).toBe(second);
        expect(first).toMatch(/^millennium:fp:[0-9a-f]{32}$/);
        expect(buildTransactionId(first)).toMatch(/^[0-9a-f]{11}$/);
        expect(transactionFingerprint(account.id, batch[0]!)).toHaveLength(64);
    });

    it('imports transactions and is idempotent on re-import', async () => {
        const first = await ingestTransactions(db, groupId, 'millennium', account, batch);
        expect(first.imported).toBe(2);
        expect(first.skipped).toBe(0);

        const rows = await db.execute({
            sql: `SELECT external_id, cleared_status, amount FROM transactions WHERE group_id = ? ORDER BY date`,
            args: [groupId],
        });
        expect(rows.rows).toHaveLength(2);
        expect(rows.rows.every((row: any) => row.cleared_status === 'X')).toBe(true);
        expect(rows.rows.every((row: any) => String(row.external_id).startsWith('millennium:fp:'))).toBe(true);

        const second = await ingestTransactions(db, groupId, 'millennium', account, batch);
        expect(second.imported).toBe(0);
        expect(second.skipped).toBe(2);

        const count = await db.execute({
            sql: `SELECT COUNT(*) as count FROM transactions WHERE group_id = ?`,
            args: [groupId],
        });
        expect(Number((count.rows[0] as any).count)).toBe(2);
    });

    it('deduplicates identical rows inside a single batch', async () => {
        const result = await ingestTransactions(
            db,
            groupId,
            'brain',
            { id: 'brain-account', name: 'Brain', currency: 'PLN' },
            [
                { date: '2026-10-03', amount: -12, payee: 'Żabka', memo: 'Zakupy', balance: 50 },
                { date: '2026-10-03', amount: -12, payee: 'Żabka', memo: 'Zakupy', balance: 50 },
            ],
        );
        expect(result.imported).toBe(1);
        expect(result.skipped).toBe(1);
    });

    it('categorizes new transactions from built-in keywords and payee history', async () => {
        await db.execute({
            sql: `INSERT INTO categories (group_id, id, category, color, "order", data_json, updated_at) VALUES (?, ?, ?, ?, 0, ?, 0)`,
            args: [groupId, 'cat-train', 'Transport:Train', '#000', JSON.stringify({ id: 'cat-train', category: 'Transport:Train' })],
        });
        await db.execute({
            sql: `INSERT INTO categories (group_id, id, category, color, "order", data_json, updated_at) VALUES (?, ?, ?, ?, 0, ?, 0)`,
            args: [groupId, 'cat-out', 'Food:Eating out', '#000', JSON.stringify({ id: 'cat-out', category: 'Food:Eating out', keywords: ['kim loan'] })],
        });
        const result = await ingestTransactions(db, groupId, 'auto', { id: 'auto-account', name: 'Auto', currency: 'PLN' }, [
            { date: '2026-10-20', amount: -61, payee: 'koleo.pl', memo: 'KOLEO bilety kolejowe PID:350600373' },
            { date: '2026-10-20', amount: -27, payee: 'BAR KIM LOAN     74940' },
            { date: '2026-10-20', amount: -10, payee: 'Someone new' },
        ]);
        expect(result.imported).toBe(3);
        const rows = await db.execute({
            sql: `SELECT payee, category FROM transactions WHERE group_id = ? AND account_id = 'auto-account' ORDER BY amount`,
            args: [groupId],
        });
        expect(rows.rows.map((r: any) => r.category)).toEqual(['Transport:Train', 'Food:Eating out', '']);
    });

    it('backfills categories of existing transactions without one', async () => {
        await ingestTransactions(db, groupId, 'auto', { id: 'auto-account', name: 'Auto', currency: 'PLN' }, [
            { date: '2026-10-21', amount: -20, payee: 'Someone new', category: 'Food:Groceries' },
            { date: '2026-10-22', amount: -11, payee: 'Someone new' },
        ]);
        const dry = await categorizeExisting(db, groupId, { accountId: 'auto-account', dryRun: true });
        expect(dry.updated).toBe(0);
        expect(dry.suggestions.map((s) => s.category)).toEqual(['Food:Groceries', 'Food:Groceries']);
        const done = await categorizeExisting(db, groupId, { accountId: 'auto-account' });
        expect(done.updated).toBe(2);
        const left = await db.execute({
            sql: `SELECT count(*) AS n FROM transactions WHERE group_id = ? AND account_id = 'auto-account' AND category = ''`,
            args: [groupId],
        });
        expect(Number((left.rows[0] as any).n)).toBe(0);
    });

    it('does not repeat rows another source already imported, when asked to match them', async () => {
        const acc = { id: 'match-account', name: 'Match', currency: 'PLN' };
        await ingestTransactions(db, groupId, 'mbank-csv', acc, [
            { date: '2026-10-05', amount: -50, payee: 'KOLEO', memo: 'bilet 1' },
            { date: '2026-10-05', amount: -50, payee: 'KOLEO', memo: 'bilet 2' },
        ]);
        const bank = await ingestTransactions(db, groupId, 'enablebanking:mbank', acc, [
            { externalId: 'b1', date: '2026-10-06', amount: -50 },
            { externalId: 'b2', date: '2026-10-05', amount: -50 },
            { externalId: 'b3', date: '2026-10-05', amount: -50 },
            { externalId: 'b4', date: '2026-10-20', amount: -60 },
        ], { matchExistingDays: 3 });
        expect(bank.imported).toBe(2);
    });

    it('a pending payment becomes booked in place when the bank books it under a new id', async () => {
        const acc = { id: 'pending-account', name: 'Pending', currency: 'PLN' };
        await ingestTransactions(db, groupId, 'enablebanking:bank-millennium', acc, [
            { externalId: 'PENDING|1', date: '2026-10-27', amount: -66.14, payee: 'Bolt', bookingDate: null, category: 'Transport:Car' },
        ]);
        const booked = await ingestTransactions(db, groupId, 'enablebanking:bank-millennium', acc, [
            { externalId: 'BOOKED|7', date: '2026-10-27', amount: -66.14, bookingDate: '2026-10-29' },
        ], { mergePending: true });
        expect(booked.imported).toBe(0);
        expect(booked.merged).toBe(1);
        const rows = await db.execute({
            sql: `SELECT booking_date, category, executed_at_precision, external_id FROM transactions WHERE group_id = ? AND account_id = 'pending-account'`,
            args: [groupId],
        });
        expect(rows.rows).toHaveLength(1);
        expect(rows.rows[0]).toMatchObject({
            booking_date: '2026-10-29',
            category: 'Transport:Car',
            executed_at_precision: 'day',
            external_id: 'enablebanking:bank-millennium:id:BOOKED|7',
        });
    });

    it('creates an assert once and updates it on the next run', async () => {
        const first = await upsertConnectorAssert(db, groupId, 'millennium', {
            accountId: account.id,
            date: '2026-10-18',
            value: 4362.4,
        });
        expect(first.created).toBe(true);

        const second = await upsertConnectorAssert(db, groupId, 'millennium', {
            accountId: account.id,
            date: '2026-10-18',
            value: 5000,
        });
        expect(second.created).toBe(false);

        const rows = await db.execute({
            sql: `SELECT value FROM asserts WHERE group_id = ? AND id = ?`,
            args: [groupId, first.id],
        });
        expect(rows.rows).toHaveLength(1);
        expect(Number((rows.rows[0] as any).value)).toBe(5000);
    });

    it('keeps one assert per account and month, moved to the latest balance', async () => {
        const first = await upsertConnectorAssert(db, groupId, 'millennium', { accountId: account.id, date: '2026-07-02', value: 10 });
        const later = await upsertConnectorAssert(db, groupId, 'millennium', { accountId: account.id, date: '2026-07-29', value: 12.5 });
        const next = await upsertConnectorAssert(db, groupId, 'millennium', { accountId: account.id, date: '2026-08-01', value: 13 });
        expect(later.id).toBe(first.id);
        expect(later.created).toBe(false);
        expect(next.created).toBe(true);
        const rows = await db.execute({ sql: `SELECT date, value FROM asserts WHERE group_id = ? AND id = ?`, args: [groupId, first.id] });
        expect(rows.rows[0]).toMatchObject({ date: '2026-07-29', value: 12.5 });
    });
});
