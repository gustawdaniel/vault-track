import crypto from 'node:crypto';
import { Client, InStatement } from '@libsql/client';
import { buildEventMaterializeStatements, executeInChunks } from '../sync/materializer';
import { CategoryDefinition, createCategorizer, isMeaningfulCategory } from './categorize';
import { ExecutedAtPrecision, ExecutedAtSource, knowsExecutionBetter, withDates } from '../sync/dates';

export interface ConnectorTransactionInput {
    /** Stable identifier from the bank/connector. If omitted, a content fingerprint is used. */
    externalId?: string;
    date: string;
    amount: number;
    payee?: string;
    memo?: string;
    category?: string;
    currency?: string;
    balance?: number;
    clearedStatus?: '' | '*' | 'X' | '?';
    raw?: Record<string, unknown>;
    /** when it was really paid or ordered (modules/sync/dates.ts); without it, `date` known to the day */
    executedAt?: string;
    executedAtPrecision?: ExecutedAtPrecision;
    executedAtSource?: ExecutedAtSource;
    /** the day the bank booked it; null while it is not booked yet; omitted = booked on `date` */
    bookingDate?: string | null;
}

export interface ConnectorAccount {
    id: string;
    name: string;
    currency?: string;
}

export interface IngestResult {
    imported: number;
    skipped: number;
    total: number;
    transactionIds: string[];
    /** not-yet-booked rows that became booked under a new bank id */
    merged?: number;
}

export function normalizeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function parseAmount(value: unknown): number {
    const text = normalizeText(value).replace(/\s+/g, '').replace(',', '.');
    if (!text) return 0;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Deterministic content fingerprint for sources that do not expose a bank transaction id.
 * `balance` (running balance after the transaction) makes repeated same-day/same-amount
 * rows distinguishable without relying on file order.
 */
export function transactionFingerprint(
    accountId: string,
    tx: ConnectorTransactionInput,
    occurrence = 0,
): string {
    const parts = [
        accountId,
        normalizeText(tx.date),
        Number(tx.amount).toFixed(8),
        normalizeText(tx.currency),
        normalizeText(tx.payee),
        normalizeText(tx.memo),
        tx.balance === undefined || tx.balance === null ? '' : Number(tx.balance).toFixed(8),
        String(occurrence),
    ];
    return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

export function buildExternalId(source: string, accountId: string, tx: ConnectorTransactionInput): string {
    if (tx.externalId && normalizeText(tx.externalId)) {
        return `${source}:id:${normalizeText(tx.externalId)}`;
    }
    return `${source}:fp:${transactionFingerprint(accountId, tx).substring(0, 32)}`;
}

/**
 * Where a transaction is known from (modules/sync/dates.ts holds the dates): one row can be made of several, e.g. a
 * receipt typed in the app and the bank payment that paid it. `id` is the source's own id (the dedupe key).
 */
export interface TransactionSource {
    kind: 'manual' | 'bank-api' | 'bank-web' | 'csv' | 'scan' | 'email' | 'import';
    source?: string;
    id?: string;
    at: string;
    amount?: number;
    date?: string;
    payee?: string;
    memo?: string;
    category?: string;
    executedAt?: string;
    /** null: the source has not booked it yet */
    bookingDate?: string | null;
    /** everything the source sent about it */
    raw?: Record<string, unknown>;
}

export function sourceKind(source: string): TransactionSource['kind'] {
    if (source.startsWith('enablebanking')) return 'bank-api';
    if (source.endsWith('-csv') || source.includes('csv')) return 'csv';
    if (source.startsWith('scan')) return 'scan';
    if (source.startsWith('email')) return 'email';
    if (source.includes('web')) return 'bank-web';
    return 'import';
}

/**
 * 11-character id, matching the shape used by the browser app. Deterministic so that
 * re-importing the same bank row is idempotent.
 */
export function buildTransactionId(externalId: string): string {
    return crypto.createHash('sha256').update(externalId).digest('hex').substring(0, 11);
}

function buildTransactionEvent(
    source: string,
    account: ConnectorAccount,
    tx: ConnectorTransactionInput,
    externalId: string,
    index: number,
) {
    const id = buildTransactionId(externalId);
    return {
        eventId: `connector:${source}:${id}`,
        deviceId: `connector:${source}`,
        counter: index + 1,
        timestamp: Date.now() + index,
        type: 'TRANSACTION_ADDED',
        payload: withDates({
            id,
            accountId: account.id,
            account: account.name,
            amount: tx.amount,
            date: tx.date,
            executedAt: tx.executedAt,
            executedAtPrecision: tx.executedAtPrecision,
            executedAtSource: tx.executedAtSource,
            bookingDate: tx.bookingDate,
            category: tx.category ?? '',
            payee: tx.payee ?? '',
            memo: tx.memo ?? '',
            clearedStatus: tx.clearedStatus ?? 'X',
            externalId,
            sources: [{ kind: sourceKind(source), source, id: externalId, at: new Date().toISOString() }],
            rawSource: {
                connector: source,
                currency: tx.currency,
                balance: tx.balance,
                ...(tx.raw || {}),
            },
        }),
    };
}

/**
 * Inserts only transactions whose external id is not already present for the group.
 * All writes go through the same event + materializer path as the browser, so the
 * change is immediately visible to `/api/sync/pull` clients.
 */
export interface IngestOptions {
    /**
     * Also skip a row when the account already has the same amount within this many days from another source
     * (a CSV import, a hand-made entry): a bank API that starts late must not repeat history imported before.
     */
    matchExistingDays?: number;
    /**
     * A booked row that arrives under a new id (Millennium changes it on booking) replaces this source's
     * not-yet-booked row of the same amount from within 3 days, instead of being added next to it.
     */
    mergePending?: boolean;
}

/** Name words that tell who was paid ("KOLEO" in a receipt, "koleo.pl" from the bank); generic words do not count. */
const GENERIC_WORDS = new Set([
    'www', 'com', 'net', 'org', 'spolka', 'ograniczona', 'ograniczonej', 'odpowiedzialnoscia', 'ogranic',
    'platnosc', 'oplata', 'zakup', 'transakcja', 'karta', 'karty', 'blik', 'przelew', 'sklep', 'bilet', 'bilety',
]);
export function nameWords(...texts: Array<string | undefined | null>): Set<string> {
    const words = texts.join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l')
        .split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !GENERIC_WORDS.has(w));
    return new Set(words);
}

/** A bank category replaces the row's when it says the same, only more precisely (Transport → Transport:Train). */
function moreSpecificCategory(current: string | undefined, incoming: string | undefined): string | undefined {
    if (!incoming) return current;
    if (!current) return incoming;
    const [base, ...project] = current.split('/');
    const incomingBase = incoming.split('/')[0]!;
    if (incomingBase.startsWith(`${base}:`)) return [incomingBase, ...project].join('/');
    return current;
}

/**
 * A row already here gets what the bank knows about the payment, and keeps what it knew better: its own name,
 * memo and amount stay, the bank's booking day comes in, the time of execution is the better known one, the category
 * the more specific one, and everything the bank sent is kept in the row's sources.
 */
export function enrichFromBank(row: any, source: string, externalId: string, tx: ConnectorTransactionInput, at: string): any {
    const sources: TransactionSource[] = Array.isArray(row.sources) ? row.sources : [];
    if (sources.some((src) => src.id === externalId)) return null;
    const bank = withDates({
        date: tx.date, executedAt: tx.executedAt, executedAtPrecision: tx.executedAtPrecision,
        executedAtSource: tx.executedAtSource ?? 'bank-api', bookingDate: tx.bookingDate,
    });
    const next: any = {
        ...row,
        sources: [...sources, {
            kind: sourceKind(source), source, id: externalId, at,
            amount: Number(tx.amount), date: tx.date, payee: tx.payee, memo: tx.memo, category: tx.category,
            executedAt: bank.executedAt, bookingDate: bank.bookingDate,
            raw: { connector: source, currency: tx.currency, balance: tx.balance, ...(tx.raw || {}) },
        }],
        category: moreSpecificCategory(row.category, tx.category),
    };
    if (typeof bank.bookingDate === 'string') next.bookingDate = bank.bookingDate;
    if (knowsExecutionBetter(bank, row)) {
        next.executedAt = bank.executedAt;
        next.executedAtPrecision = bank.executedAtPrecision;
        next.executedAtSource = bank.executedAtSource;
        next.date = bank.date;
    }
    return next;
}

function daysBetween(a: string, b: string): number {
    return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

export async function ingestTransactions(
    db: Client,
    groupId: string,
    source: string,
    account: ConnectorAccount,
    transactions: ConnectorTransactionInput[],
    options: IngestOptions = {},
): Promise<IngestResult> {
    const existing = await db.execute({
        sql: `SELECT external_id FROM transactions
              WHERE group_id = ? AND external_id IS NOT NULL`,
        args: [groupId],
    });
    const existingIds = new Set(
        existing.rows.map((row: any) => String(row.external_id)),
    );
    // ids a row was matched to (sources), e.g. the bank payment of a receipt typed in the app
    const linked = await db.execute({
        sql: `SELECT json_extract(j.value, '$.id') AS id FROM transactions, json_each(transactions.data_json, '$.sources') AS j
              WHERE transactions.group_id = ? AND json_extract(j.value, '$.id') IS NOT NULL`,
        args: [groupId],
    });
    for (const row of linked.rows as any[]) existingIds.add(String(row.id));

    const batchSeen = new Set<string>();
    const fresh: Array<{ tx: ConnectorTransactionInput; externalId: string }> = [];

    for (const tx of transactions) {
        if (!tx || !normalizeText(tx.date) || !Number.isFinite(Number(tx.amount))) continue;
        const externalId = buildExternalId(source, account.id, tx);
        if (existingIds.has(externalId) || batchSeen.has(externalId)) continue;
        batchSeen.add(externalId);
        fresh.push({ tx, externalId });
    }

    const linkEvents: any[] = [];
    if (options.matchExistingDays !== undefined && fresh.length > 0) {
        const rows = (await db.execute({
            sql: `SELECT id, date, amount, split_id, external_id, data_json FROM transactions
                  WHERE group_id = ? AND account_id = ?
                    AND (external_id IS NULL OR external_id NOT LIKE ?)`,
            args: [groupId, account.id, `${source}:%`],
        })).rows.map((row: any) => ({
            id: String(row.id), data: JSON.parse(String(row.data_json)),
            date: String(row.date), amount: Number(row.amount),
            splitId: row.split_id ? String(row.split_id) : '', externalId: row.external_id ? String(row.external_id) : '',
        }));
        // one bank payment can already be here in parts: a split (items of one receipt) or a price with its fee
        // apart (a CSV export, "<id>:fee"); each part set counts as one candidate with the sum of its amounts
        const groups = new Map<string, { date: string; amount: number; members: typeof rows }>();
        const add = (key: string, row: (typeof rows)[number]) => {
            const g = groups.get(key);
            if (g) { g.amount = Math.round((g.amount + row.amount) * 100) / 100; if (row.date < g.date) g.date = row.date; g.members.push(row); }
            else groups.set(key, { date: row.date, amount: row.amount, members: [row] });
        };
        const ids = new Set(rows.map((row) => row.externalId).filter(Boolean));
        // a row the bank has already paid (a booked payment of this source is linked to it) is not a candidate again
        const paid = (row: (typeof rows)[number]) => (Array.isArray(row.data.sources) ? row.data.sources : [])
            .some((src: any) => src.source === source && src.bookingDate !== null);
        for (const row of rows) {
            if (paid(row)) continue;
            if (row.splitId) add(`split:${row.splitId}`, row);
            else if (row.externalId.endsWith(':fee') && ids.has(row.externalId.slice(0, -4))) add(`fee:${row.externalId.slice(0, -4)}`, row);
            else if (row.externalId && ids.has(`${row.externalId}:fee`)) add(`fee:${row.externalId}`, row);
            else add(`row:${groups.size}:${row.date}`, row);
        }
        const others = [...groups.values()].map((g) => ({ ...g, used: false }));
        const days = options.matchExistingDays;
        const suggestCategory = await loadCategorizer(db, groupId);
        const linkTo = (members: typeof rows, i: number) => {
            const at = new Date().toISOString();
            const tx = fresh[i]!.tx;
            const category = isMeaningfulCategory(tx.category) ? tx.category : suggestCategory(tx)?.category ?? tx.category;
            for (const member of members) {
                const next = enrichFromBank(member.data, source, fresh[i]!.externalId, { ...tx, category }, at);
                if (next) linkEvents.push(next);
            }
            fresh.splice(i, 1);
        };
        for (let i = fresh.length - 1; i >= 0; i--) {
            const { tx } = fresh[i]!;
            const candidates = others
                .filter((o) => !o.used && Math.abs(o.amount - Number(tx.amount)) < 0.005 && daysBetween(o.date, tx.date) <= days)
                .sort((a, b) => daysBetween(a.date, tx.date) - daysBetween(b.date, tx.date));
            if (candidates[0]) {
                // the payment is already here: link it to the rows instead of adding it (its id, so it is never added later)
                candidates[0].used = true;
                linkTo(candidates[0].members, i);
                continue;
            }
            // or as 2-3 entries made before it (tickets of one order scanned one by one): same account, the bank's day
            // or up to 2 days later, the exact sum, the same name on both sides, and no other way to make that sum
            const bankWords = nameWords(tx.payee, tx.memo, (tx.raw as any)?.creditor?.name);
            const near = others.filter((o) => {
                if (o.used) return false;
                const lag = (Date.parse(`${tx.date}T00:00:00Z`) - Date.parse(`${o.date}T00:00:00Z`)) / 86_400_000;
                if (lag < 0 || lag > 2 || Math.sign(o.amount) !== Math.sign(Number(tx.amount))) return false;
                const words = nameWords(...o.members.flatMap((m) => [m.data.payee, m.data.memo, m.splitId.split('###')[0]]));
                return [...words].some((w) => bankWords.has(w));
            });
            const target = Math.round(Number(tx.amount) * 100);
            const cents = (o: (typeof near)[number]) => Math.round(o.amount * 100);
            const found: Array<typeof near> = [];
            for (let a = 0; a < near.length; a++) {
                for (let b = a + 1; b < near.length; b++) {
                    if (cents(near[a]!) + cents(near[b]!) === target) found.push([near[a]!, near[b]!]);
                    for (let c = b + 1; c < near.length; c++) {
                        if (cents(near[a]!) + cents(near[b]!) + cents(near[c]!) === target) found.push([near[a]!, near[b]!, near[c]!]);
                    }
                }
            }
            if (found.length === 1) {
                for (const part of found[0]!) part.used = true;
                linkTo(found[0]!.flatMap((part) => part.members), i);
            }
        }
        if (linkEvents.length > 0) {
            const now = Date.now();
            await executeInChunks(db, buildEventMaterializeStatements(groupId, linkEvents.map((payload, index) => ({
                eventId: `connector:${source}:link:${payload.id}:${now}`,
                deviceId: `connector:${source}`,
                counter: index + 1,
                timestamp: now + index,
                type: 'TRANSACTION_UPDATED',
                payload,
            }))));
        }
    }

    const merged: any[] = [];
    if (options.mergePending && fresh.length > 0) {
        const pending = (await db.execute({
            sql: `SELECT id, date, amount, data_json FROM transactions
                  WHERE group_id = ? AND account_id = ? AND booking_date IS NULL AND external_id LIKE ?`,
            args: [groupId, account.id, `${source}:%`],
        })).rows.map((row: any) => ({ id: String(row.id), date: String(row.date), amount: Number(row.amount), data: JSON.parse(String(row.data_json)), used: false }));
        for (let i = fresh.length - 1; i >= 0; i--) {
            const { tx, externalId } = fresh[i]!;
            if (!tx.bookingDate) continue;
            const row = pending.find((p) => !p.used && Math.abs(p.amount - Number(tx.amount)) < 0.005 && daysBetween(p.date, tx.date) <= 3);
            if (!row) continue;
            row.used = true;
            fresh.splice(i, 1);
            merged.push({
                ...row.data,
                externalId,
                bookingDate: tx.bookingDate,
                payee: row.data.payee || tx.payee || '',
                memo: row.data.memo || tx.memo || '',
                rawSource: { connector: source, currency: tx.currency, ...(tx.raw || {}) },
            });
        }
        if (merged.length > 0) {
            const now = Date.now();
            await executeInChunks(db, buildEventMaterializeStatements(groupId, merged.map((payload, index) => ({
                eventId: `connector:${source}:booked:${payload.id}:${now}`,
                deviceId: `connector:${source}`,
                counter: index + 1,
                timestamp: now + index,
                type: 'TRANSACTION_UPDATED',
                payload,
            }))));
        }
    }

    if (fresh.length === 0) {
        return { imported: 0, skipped: transactions.length - merged.length, total: transactions.length, transactionIds: [], merged: merged.length };
    }

    const suggest = await loadCategorizer(db, groupId);
    const events = fresh.map(({ tx, externalId }, index) => {
        const category = isMeaningfulCategory(tx.category) ? tx.category : suggest(tx)?.category ?? tx.category;
        return buildTransactionEvent(source, account, { ...tx, category }, externalId, index);
    });

    const statements = buildEventMaterializeStatements(groupId, events);
    await executeInChunks(db, statements);

    return {
        imported: fresh.length,
        skipped: transactions.length - fresh.length - merged.length,
        total: transactions.length,
        transactionIds: fresh.map(({ externalId }) => buildTransactionId(externalId)),
        merged: merged.length,
    };
}

/** The categorizer for a group: its categories (with the user's keywords) and every categorized transaction. */
export async function loadCategorizer(db: Client, groupId: string) {
    const categories = await db.execute({
        sql: `SELECT category, data_json FROM categories WHERE group_id = ?`,
        args: [groupId],
    });
    const definitions: CategoryDefinition[] = categories.rows.map((row: any) => {
        let data: any = {};
        try {
            data = row.data_json ? JSON.parse(String(row.data_json)) : {};
        } catch {
            data = {};
        }
        return {
            category: String(row.category),
            keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
        };
    });
    const history = await db.execute({
        sql: `SELECT payee, category, amount FROM transactions
              WHERE group_id = ? AND category IS NOT NULL AND category != ''`,
        args: [groupId],
    });
    return createCategorizer(
        definitions,
        history.rows.map((row: any) => ({ payee: row.payee, category: row.category, amount: Number(row.amount) })),
    );
}

export interface CategorizeOptions {
    accountId?: string;
    dateFrom?: string;
    /** also re-categorize transactions marked "Other:Uncategorized" */
    includeUncategorized?: boolean;
    dryRun?: boolean;
}

export interface CategorizeResult {
    checked: number;
    updated: number;
    suggestions: Array<{ id: string; date: string; amount: number; payee: string; category: string; reason: string; match: string }>;
}

/** Fills in categories of transactions that have none, with the same rules as ingest. */
export async function categorizeExisting(
    db: Client,
    groupId: string,
    options: CategorizeOptions,
): Promise<CategorizeResult> {
    const conditions = ['group_id = ?'];
    const args: any[] = [groupId];
    conditions.push(options.includeUncategorized
        ? `(category IS NULL OR category = '' OR category = 'Other:Uncategorized')`
        : `(category IS NULL OR category = '')`);
    if (options.accountId) {
        conditions.push('account_id = ?');
        args.push(options.accountId);
    }
    if (options.dateFrom) {
        conditions.push('date >= ?');
        args.push(options.dateFrom);
    }
    const rows = await db.execute({
        sql: `SELECT id, date, amount, payee, memo, data_json FROM transactions WHERE ${conditions.join(' AND ')} ORDER BY date`,
        args,
    });
    const suggest = await loadCategorizer(db, groupId);
    const suggestions: CategorizeResult['suggestions'] = [];
    const events: any[] = [];
    const now = Date.now();
    for (const row of rows.rows as any[]) {
        const suggestion = suggest({ payee: row.payee, memo: row.memo, amount: Number(row.amount) });
        if (!suggestion) continue;
        suggestions.push({
            id: String(row.id),
            date: String(row.date),
            amount: Number(row.amount),
            payee: String(row.payee ?? ''),
            ...suggestion,
        });
        let payload: any;
        try {
            payload = JSON.parse(String(row.data_json));
        } catch {
            continue;
        }
        events.push({
            eventId: `connector:categorize:${row.id}:${now}`,
            deviceId: 'connector:categorize',
            counter: events.length + 1,
            timestamp: now + events.length,
            type: 'TRANSACTION_UPDATED',
            payload: { ...payload, category: suggestion.category },
        });
    }
    if (!options.dryRun && events.length > 0) {
        await executeInChunks(db, buildEventMaterializeStatements(groupId, events));
    }
    return { checked: rows.rows.length, updated: options.dryRun ? 0 : events.length, suggestions };
}

export interface ConnectorAssertInput {
    accountId: string;
    date: string;
    value: number;
    currency?: string;
}

export async function upsertConnectorAssert(
    db: Client,
    groupId: string,
    source: string,
    input: ConnectorAssertInput,
): Promise<{ id: string; created: boolean }> {
    const id = `connector:${source}:${input.accountId}:${input.date}`;
    const existing = await db.execute({
        sql: `SELECT id FROM asserts WHERE group_id = ? AND id = ? LIMIT 1`,
        args: [groupId, id],
    });
    const created = existing.rows.length === 0;

    const event = {
        eventId: `connector:${source}:assert:${id}:${input.date}:${input.value}`,
        deviceId: `connector:${source}`,
        counter: 1,
        timestamp: Date.now(),
        type: created ? 'ASSERT_CREATED' : 'ASSERT_UPDATED',
        payload: {
            id,
            accountId: input.accountId,
            date: input.date,
            value: input.value,
            updatedAt: new Date().toISOString(),
            source,
        },
    };

    const statements: InStatement[] = buildEventMaterializeStatements(groupId, [event]);
    await executeInChunks(db, statements);

    return { id, created };
}

/** The last day of the month before `day` ("2026-10-29" → "2026-09-30"). */
export function previousMonthEnd(day: string): string {
    const d = new Date(`${day.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCDate(0);
    return d.toISOString().slice(0, 10);
}

/**
 * The bank checkpoint of a finished month: one assert on its last day, created once and never moved.
 * A bank gives today's balance only, so the month-end balance is today's balance minus what was booked after
 * the month ended (an available balance also counts payments not booked yet). Days of the running month get
 * no assert: during the day a bank balance lags behind payments already made.
 */
export async function ensureMonthEndAssert(
    db: Client,
    groupId: string,
    source: string,
    input: { accountId: string; balanceDate: string; balance: number; booked: boolean },
): Promise<{ id: string; created: boolean; date: string; value: number } | null> {
    const monthEnd = previousMonthEnd(input.balanceDate);
    const existing = await db.execute({
        // any assert of that month, also a hand-made one: one checkpoint per month is enough
        sql: `SELECT id FROM asserts WHERE group_id = ? AND account_id = ? AND substr(date, 1, 7) = ?`,
        args: [groupId, input.accountId, monthEnd.slice(0, 7)],
    });
    if (existing.rows.length > 0) return { id: String((existing.rows[0] as any).id), created: false, date: monthEnd, value: NaN };

    const after = await db.execute({
        sql: input.booked
            ? `SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE group_id = ? AND account_id = ? AND booking_date > ?`
            : `SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE group_id = ? AND account_id = ? AND COALESCE(booking_date, date) > ?`,
        args: [groupId, input.accountId, monthEnd],
    });
    const value = Math.round((input.balance - Number((after.rows[0] as any).s)) * 100) / 100;
    const result = await upsertConnectorAssert(db, groupId, source, { accountId: input.accountId, date: monthEnd, value });
    return { ...result, date: monthEnd, value };
}

export interface ConnectorRunInput {
    groupId: string;
    source: string;
    startedAt: number;
    status: 'ok' | 'error';
    imported: number;
    skipped: number;
    error?: string;
    details?: Record<string, unknown>;
}

export async function logConnectorRun(db: Client, input: ConnectorRunInput): Promise<void> {
    await db.execute({
        sql: `INSERT INTO connector_runs (
                id, group_id, source, started_at, finished_at, status,
                imported, skipped, error, details_json
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            crypto.randomUUID(),
            input.groupId,
            input.source,
            input.startedAt,
            Date.now(),
            input.status,
            input.imported,
            input.skipped,
            input.error ?? null,
            input.details ? JSON.stringify(input.details) : null,
        ],
    });
}

export async function getConnectorStatus(db: Client, groupId: string) {
    const result = await db.execute({
        sql: `SELECT source, status, imported, skipped, started_at, finished_at, error
              FROM connector_runs
              WHERE group_id = ?
              ORDER BY started_at DESC
              LIMIT 200`,
        args: [groupId],
    });

    const latest = new Map<string, any>();
    for (const row of result.rows as any[]) {
        const source = String(row.source);
        if (latest.has(source)) continue;
        latest.set(source, {
            source,
            status: row.status,
            imported: Number(row.imported ?? 0),
            skipped: Number(row.skipped ?? 0),
            startedAt: Number(row.started_at),
            finishedAt: row.finished_at === null ? null : Number(row.finished_at),
            error: row.error ?? null,
        });
    }

    return Array.from(latest.values());
}
