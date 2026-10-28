import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@libsql/client';
import {
    buildExternalId,
    ConnectorTransactionInput,
    ingestTransactions,
    upsertConnectorAssert,
} from './service';
import { buildEventMaterializeStatements, executeInChunks } from '../sync/materializer';

export interface EnableBankingConfig {
    appId: string;
    privateKeyPath: string;
    apiBase: string;
    redirectUrl?: string;
}

export interface EnableBankingAspsp {
    name: string;
    country: string;
    logo?: string;
    bic?: string;
    [key: string]: unknown;
}

export interface EnableBankingAccount {
    uid: string;
    account_id?: string | { iban?: string; other?: { identification?: string } | null } | null;
    name?: string;
    currency?: string;
    cash_account_type?: string;
    product?: string;
    details?: string;
    [key: string]: unknown;
}

/**
 * Enable Banking returns `account_id` either as a string or as an
 * AccountIdentification object ({ iban, other }). Flatten it for display
 * and for IBAN matching against VaultTrack accounts.
 */
export function getAccountIban(account: any): string {
    const identification = account?.account_id;
    if (!identification) return '';
    if (typeof identification === 'string') return identification;
    return identification.iban || identification.other?.identification || '';
}

export interface EnableBankingSession {
    session_id: string;
    accounts: EnableBankingAccount[];
    access?: { valid_until?: string };
    [key: string]: unknown;
}

/**
 * Enable Banking configuration is read from env so the same image works locally
 * and on the VPS. The private key is never stored in the database or the image.
 */
export function getEnableBankingConfig(): EnableBankingConfig | null {
    const appId = (process.env.ENABLE_BANKING_APP_ID || '').trim();
    const configuredPath = (process.env.ENABLE_BANKING_PRIVATE_KEY_PATH || '').trim();
    const privateKeyPath = configuredPath || (
        appId
            ? path.resolve(process.cwd(), 'secrets', 'enablebanking', `${appId}.pem`)
            : ''
    );

    if (!appId || !privateKeyPath || !fs.existsSync(privateKeyPath)) {
        return null;
    }

    return {
        appId,
        privateKeyPath,
        apiBase: (process.env.ENABLE_BANKING_API_BASE || 'https://api.enablebanking.com').replace(/\/+$/, ''),
        redirectUrl: process.env.ENABLE_BANKING_REDIRECT_URL,
    };
}

function base64url(value: Buffer | string): string {
    return Buffer.from(value).toString('base64url');
}

export function createEnableBankingJwt(
    appId: string,
    privateKeyPem: string,
    ttlSeconds = 3600,
): string {
    const now = Math.floor(Date.now() / 1000);
    const header = { typ: 'JWT', alg: 'RS256', kid: appId };
    const payload = {
        iss: 'enablebanking.com',
        aud: 'api.enablebanking.com',
        iat: now,
        exp: now + ttlSeconds,
    };

    const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
    const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKeyPem);

    return `${signingInput}.${base64url(signature)}`;
}

async function ebRequest<T>(
    config: EnableBankingConfig,
    endpoint: string,
    init: RequestInit = {},
): Promise<T> {
    const privateKey = fs.readFileSync(config.privateKeyPath, 'utf-8');
    const jwt = createEnableBankingJwt(config.appId, privateKey);

    const response = await fetch(`${config.apiBase}${endpoint}`, {
        ...init,
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${jwt}`,
            ...(init.headers || {}),
        },
    });

    const text = await response.text();
    let body: unknown = null;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        body = text;
    }

    if (!response.ok) {
        const detail = typeof body === 'string' ? body : JSON.stringify(body);
        throw new Error(
            `Enable Banking ${init.method || 'GET'} ${endpoint} -> HTTP ${response.status}: ${detail}`,
        );
    }

    return body as T;
}

export async function listAspsps(
    config: EnableBankingConfig,
    country = 'PL',
): Promise<EnableBankingAspsp[]> {
    const data = await ebRequest<{ aspsps?: EnableBankingAspsp[] }>(
        config,
        `/aspsps?country=${encodeURIComponent(country)}`,
    );
    return data.aspsps || [];
}

export interface StartAuthorizationInput {
    aspspName: string;
    country: string;
    state: string;
    redirectUrl: string;
    validUntilDays?: number;
    psuType?: 'personal' | 'business';
}

export async function startAuthorization(
    config: EnableBankingConfig,
    input: StartAuthorizationInput,
): Promise<{ url: string }> {
    const validUntil = new Date(
        Date.now() + (input.validUntilDays ?? 180) * 24 * 60 * 60 * 1000,
    ).toISOString();

    return ebRequest<{ url: string }>(config, '/auth', {
        method: 'POST',
        body: JSON.stringify({
            access: { valid_until: validUntil },
            aspsp: { name: input.aspspName, country: input.country },
            state: input.state,
            redirect_url: input.redirectUrl,
            psu_type: input.psuType || 'personal',
        }),
    });
}

export async function createSession(
    config: EnableBankingConfig,
    code: string,
): Promise<EnableBankingSession> {
    return ebRequest<EnableBankingSession>(config, '/sessions', {
        method: 'POST',
        body: JSON.stringify({ code }),
    });
}

/**
 * Accounts of an authorized session. Some banks (mBank) answer POST /sessions with an empty account list;
 * GET /sessions/{id} lists the account uids, and each account's details carry its IBAN.
 */
export async function getSessionAccounts(
    config: EnableBankingConfig,
    sessionId: string,
): Promise<EnableBankingAccount[]> {
    const session = await ebRequest<{ accounts?: Array<string | { uid?: string }>; accounts_data?: Array<{ uid?: string }> }>(
        config,
        `/sessions/${encodeURIComponent(sessionId)}`,
    );
    const uids = [
        ...(session.accounts || []).map((a) => (typeof a === 'string' ? a : a?.uid)),
        ...(session.accounts_data || []).map((a) => a?.uid),
    ].filter((uid, i, all): uid is string => !!uid && all.indexOf(uid) === i);
    const accounts: EnableBankingAccount[] = [];
    for (const uid of uids) {
        const details = await ebRequest<EnableBankingAccount>(config, `/accounts/${encodeURIComponent(uid)}/details`);
        accounts.push({ ...details, uid });
    }
    return accounts;
}

export async function getBalances(
    config: EnableBankingConfig,
    accountUid: string,
): Promise<any[]> {
    const data = await ebRequest<{ balances?: any[] }>(
        config,
        `/accounts/${encodeURIComponent(accountUid)}/balances`,
    );
    return data.balances || [];
}

export async function getTransactions(
    config: EnableBankingConfig,
    accountUid: string,
    options: { dateFrom?: string; continuationKey?: string; status?: 'BOOK' | 'PDNG' } = {},
): Promise<{ transactions: any[]; continuation_key?: string }> {
    const params = new URLSearchParams();
    if (options.dateFrom) params.set('date_from', options.dateFrom);
    if (options.status) params.set('transaction_status', options.status);
    if (options.continuationKey) params.set('continuation_key', options.continuationKey);

    const query = params.toString();
    return ebRequest<{ transactions: any[]; continuation_key?: string }>(
        config,
        `/accounts/${encodeURIComponent(accountUid)}/transactions${query ? `?${query}` : ''}`,
    );
}

export async function getAllTransactions(
    config: EnableBankingConfig,
    accountUid: string,
    dateFrom?: string,
    status?: 'BOOK' | 'PDNG',
): Promise<any[]> {
    const all: any[] = [];
    let continuationKey: string | undefined;
    let pages = 0;

    do {
        const page = await getTransactions(config, accountUid, {
            dateFrom,
            continuationKey,
            status,
        });
        all.push(...(page.transactions || []));
        continuationKey = page.continuation_key;
        pages++;
    } while (continuationKey && pages < 20);

    return all;
}

const REVOLUT_ASPSP = 'revolut';

/**
 * Revolut's booking_date is the day the card was charged (the day it was made) and value_date is the day it
 * settled and moved the balance (the booking day). Every other bank uses transaction_date for the day it was
 * made and booking_date for the booking day.
 */
export function mapEnableBankingTransaction(tx: any, aspspName?: string): ConnectorTransactionInput | null {
    const isRevolut = String(aspspName || '').toLowerCase() === REVOLUT_ASPSP;
    // the day it was made; the bank's booking day apart (null while pending). APIs give days, not times.
    const date = isRevolut
        ? (tx?.booking_date || tx?.transaction_date || tx?.value_date)
        : (tx?.transaction_date || tx?.value_date || tx?.booking_date);
    if (!date) return null;
    const booked = String(tx?.status || 'BOOK').toUpperCase() === 'BOOK';
    const bookingDate = booked
        ? (isRevolut
            ? String(tx?.value_date || tx?.booking_date || date)
            : String(tx?.booking_date || tx?.value_date || date))
        : null;

    const rawAmount = Number(
        tx?.transaction_amount?.amount ?? tx?.instructed_amount?.amount ?? NaN,
    );
    // card authorisation holds come as 0.00 and never move money
    if (!Number.isFinite(rawAmount) || rawAmount === 0) return null;

    const amount = tx?.credit_debit_indicator === 'DBIT'
        ? -Math.abs(rawAmount)
        : Math.abs(rawAmount);

    const isDebit = tx?.credit_debit_indicator === 'DBIT';
    const payee =
        (isDebit ? tx?.creditor?.name : tx?.debtor?.name)
        || tx?.creditor?.name
        || tx?.debtor?.name
        || '';

    const remittance = tx?.remittance_information_unstructured
        || (Array.isArray(tx?.remittance_information)
            ? tx.remittance_information.join(' ')
            : tx?.remittance_information)
        || tx?.additional_information
        || '';

    const status = String(tx?.status || '').toUpperCase();
    const clearedStatus = status === 'BOOK' ? 'X' : status === 'PDNG' ? '?' : '';

    return {
        externalId: tx?.transaction_id || tx?.entry_reference || undefined,
        date: String(date),
        amount,
        payee: payee ? String(payee) : undefined,
        memo: remittance ? String(remittance) : undefined,
        currency: tx?.transaction_amount?.currency || tx?.instructed_amount?.currency,
        balance: tx?.balance_after_transaction?.amount !== undefined
            ? Number(tx.balance_after_transaction.amount)
            : undefined,
        clearedStatus,
        executedAtPrecision: 'day',
        executedAtSource: 'bank-api',
        bookingDate,
        raw: tx,
    };
}

function isBookedBalance(type: string): boolean {
    return ['CLBD', 'closingBooked', 'ITBD', 'interimBooked', 'OPBD', 'openingBooked'].includes(type);
}

export function pickBalance(balances: any[]): {
    value: number;
    date: string;
    currency?: string;
    type: string;
} | null {
    // Prefer booked balances for reconciliation; available balances include
    // card holds and other reservations. Both short (Berlin Group) and long
    // names are accepted because ASPSPs return different conventions.
    const preferred = [
        'CLBD', 'closingBooked',
        'ITBD', 'interimBooked',
        'OPBD', 'openingBooked',
        'ITAV', 'interimAvailable',
        'FWAV', 'forwardAvailable',
        'XPCD', 'expected',
    ];

    const sorted = [...balances].sort((a, b) => {
        const ai = preferred.indexOf(String(a?.balance_type || ''));
        const bi = preferred.indexOf(String(b?.balance_type || ''));
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    for (const balance of sorted) {
        const value = Number(balance?.balance_amount?.amount ?? NaN);
        if (!Number.isFinite(value)) continue;

        return {
            value,
            date: String(
                balance?.reference_date
                || balance?.last_change_date_time
                || new Date().toISOString().slice(0, 10),
            ).slice(0, 10),
            currency: balance?.balance_amount?.currency,
            type: String(balance?.balance_type || 'unknown'),
        };
    }

    return null;
}

export function sourceSlug(aspspName: string): string {
    return `enablebanking:${aspspName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')}`;
}

export interface SyncEnableBankingInput {
    groupId: string;
    accountId: string;
    accountName: string;
    accountCurrency?: string;
    aspspName: string;
    providerAccountId: string;
    dateFrom?: string;
}

export async function syncEnableBankingLink(
    db: Client,
    config: EnableBankingConfig,
    input: SyncEnableBankingInput,
) {
    const source = sourceSlug(input.aspspName);
    const transactions = await getAllTransactions(
        config,
        input.providerAccountId,
        input.dateFrom,
    );
    // payments the bank has not booked yet belong to the real state of the account too
    let pendingNote: string | null = null;
    const pendingRaw = await getAllTransactions(config, input.providerAccountId, input.dateFrom, 'PDNG').catch((error: any) => {
        pendingNote = `pending not available: ${error?.message || error}`;
        return [] as any[];
    });

    const mapped = [...transactions, ...pendingRaw]
        .map((tx) => mapEnableBankingTransaction(tx, input.aspspName))
        .filter((tx): tx is ConnectorTransactionInput => tx !== null);

    const dates = mapped
        .map((tx) => tx.date)
        .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
        .sort();

    const actualFrom = dates[0];
    const actualTo = dates[dates.length - 1];

    const ingest = await ingestTransactions(
        db,
        input.groupId,
        source,
        {
            id: input.accountId,
            name: input.accountName,
            currency: input.accountCurrency,
        },
        mapped,
        { matchExistingDays: 3, mergePending: true },
    );

    // a pending payment the bank no longer lists (reverted, or booked under an id we could not tie) leaves the ledger
    const listed = new Set(mapped.map((tx) => buildExternalId(source, input.accountId, tx)));
    const stale = (await db.execute({
        sql: `SELECT id, external_id FROM transactions
              WHERE group_id = ? AND account_id = ? AND booking_date IS NULL AND external_id LIKE ? AND date >= ?`,
        args: [input.groupId, input.accountId, `${source}:%`, input.dateFrom ?? '0000-00-00'],
    })).rows.filter((row: any) => !listed.has(String(row.external_id)));
    if (stale.length > 0) {
        const now = Date.now();
        await executeInChunks(db, buildEventMaterializeStatements(input.groupId, stale.map((row: any, index) => ({
            eventId: `connector:${source}:gone:${row.id}:${now}`,
            deviceId: `connector:${source}`,
            counter: index + 1,
            timestamp: now + index,
            type: 'TRANSACTION_DELETED',
            payload: { id: String(row.id) },
        }))));
    }

    const balances = await getBalances(config, input.providerAccountId);
    const booked = pickBalance(balances);
    // the assert is the real state: the booked balance plus what is spent and not booked yet
    const pendingSum = Math.round(mapped.filter((tx) => tx.bookingDate === null).reduce((sum, tx) => sum + tx.amount, 0) * 100) / 100;
    const balance = booked
        ? { ...booked, value: Math.round((booked.value + (isBookedBalance(booked.type) ? pendingSum : 0)) * 100) / 100, pendingSum }
        : null;
    const assertion = balance
        ? await upsertConnectorAssert(db, input.groupId, source, {
            accountId: input.accountId,
            date: balance.date,
            value: balance.value,
            currency: balance.currency,
        })
        : null;

    return {
        ...ingest,
        requestedFrom: input.dateFrom ?? null,
        actualFrom: actualFrom ?? null,
        actualTo: actualTo ?? null,
        historyGap: input.dateFrom && actualFrom && actualFrom > input.dateFrom
            ? { requestedFrom: input.dateFrom, actualFrom }
            : null,
        balance,
        assertion,
        removedPending: stale.length,
        pendingNote,
    };
}
