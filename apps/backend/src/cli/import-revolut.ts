#!/usr/bin/env node
/**
 * Revolut CSV connector.
 *
 * Usage:
 *   pnpm --filter backend import:revolut -- \
 *     --file ~/Downloads/account-statement.csv \
 *     --account-id 6d0228634a4 \
 *     --group-id <sha256-of-mnemonic> \
 *     --api http://localhost:4500
 *
 * Options:
 *   --file <path>        CSV export (repeatable)
 *   --account-id <id>    VaultTrack account id (Revolut PLN: 6d0228634a4)
 *   --group-id <id>      X-Sync-Group-ID (or SYNC_GROUP_ID env)
 *   --api <url>          Backend base URL (default http://localhost:4500)
 *   --since <YYYY-MM-DD> Import from this date (default: last known date)
 *   --all                Ignore the since cutoff (fresh account only)
 *   --no-match-existing  Do not skip rows matching existing date+amount (±1 day)
 *   --dry-run            Parse and report without sending anything
 *   --assert-latest      Create/update a balance assert from the newest completed row
 *   --batch-size <n>     Transactions per request (default 500)
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseRevolutCsv, replaceApiRows } from '../modules/connectors/revolut';
import { ConnectorTransactionInput } from '../modules/connectors/service';

interface Args {
    files: string[];
    accountId?: string;
    groupId?: string;
    api: string;
    since?: string;
    all: boolean;
    matchExisting: boolean;
    dryRun: boolean;
    assertLatest: boolean;
    batchSize: number;
}

function parseArgs(argv: string[]): Args {
    const args: Args = {
        files: [],
        api: 'http://localhost:4500',
        all: false,
        matchExisting: true,
        dryRun: false,
        assertLatest: false,
        batchSize: 500,
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        switch (arg) {
            case '--file': args.files.push(argv[++i]); break;
            case '--account-id': args.accountId = argv[++i]; break;
            case '--group-id': args.groupId = argv[++i]; break;
            case '--api': args.api = argv[++i]; break;
            case '--since': args.since = argv[++i]; break;
            case '--all': args.all = true; break;
            case '--no-match-existing': args.matchExisting = false; break;
            case '--dry-run': args.dryRun = true; break;
            case '--assert-latest': args.assertLatest = true; break;
            case '--batch-size': args.batchSize = Math.max(1, Number(argv[++i]) || 500); break;
            case '--help':
            case '-h':
                console.log(fs.readFileSync(__filename, 'utf-8').split('*/')[0]);
                process.exit(0);
                break;
            default:
                throw new Error(`Unknown argument: ${arg}`);
        }
    }

    args.groupId = args.groupId || process.env.SYNC_GROUP_ID;
    if (args.files.length === 0) throw new Error('At least one --file is required');
    if (!args.accountId) throw new Error('--account-id is required');
    if (!args.groupId) throw new Error('--group-id or SYNC_GROUP_ID is required');
    return args;
}

async function apiRequest(args: Args, method: string, endpoint: string, body?: unknown) {
    const response = await fetch(`${args.api.replace(/\/$/, '')}${endpoint}`, {
        method,
        headers: {
            'content-type': 'application/json',
            'x-sync-group-id': args.groupId!,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    let parsed: any = null;
    try {
        parsed = text ? JSON.parse(text) : null;
    } catch {
        parsed = text;
    }

    if (!response.ok) {
        throw new Error(`${method} ${endpoint} -> HTTP ${response.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
    }
    return parsed;
}

function amountKey(amount: number): string {
    return Number(amount).toFixed(2);
}

function shiftDate(date: string, days: number): string {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const snapshot = await apiRequest(args, 'GET', '/api/sync/snapshot');
    const account = (snapshot.accounts || []).find((item: any) => String(item.id) === args.accountId);
    if (!account) throw new Error(`Account ${args.accountId} not found in backend snapshot`);

    const accountRows: any[] = (snapshot.transactions || []).filter(
        (tx: any) => String(tx.accountId) === args.accountId,
    );
    // rows from the bank API are replaced by the export (fees apart), not matched against it
    const isApiRow = (tx: any) => String(tx.externalId || '').startsWith('enablebanking:revolut');
    const existing = accountRows.filter((tx) => !isApiRow(tx));

    let parseSkipped = 0;
    const parsed = args.files.flatMap((file) => {
        const fullPath = path.resolve(file);
        const text = fs.readFileSync(fullPath, 'utf-8');
        const result = parseRevolutCsv(text);
        parseSkipped += result.skipped;
        console.error(
            `[revolut] ${path.basename(fullPath)}: ${result.transactions.length} completed rows, ${result.skipped} skipped`,
        );
        return result.transactions;
    });

    const accountCurrency = String(account.currency || '').toUpperCase();
    let currencySkipped = 0;
    const normalized = parsed.filter((tx) => {
        if (accountCurrency && tx.currency && tx.currency.toUpperCase() !== accountCurrency) {
            currencySkipped++;
            return false;
        }
        return true;
    });

    let since = args.since;
    if (!since && !args.all && existing.length > 0) {
        const maxDate = existing
            .map((tx) => String(tx.date))
            .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
            .sort()
            .pop();
        if (maxDate) since = maxDate;
        console.error(`[revolut] no --since given, starting at last known date: ${since}`);
    }

    let candidates = since
        ? normalized.filter((tx) => tx.date >= since!)
        : normalized;

    const existingByAmount = new Map<string, Array<{ date: string; used: boolean }>>();
    for (const tx of existing) {
        const key = amountKey(Number(tx.amount));
        if (!existingByAmount.has(key)) existingByAmount.set(key, []);
        existingByAmount.get(key)!.push({ date: String(tx.date), used: false });
    }

    let matchedExisting = 0;
    if (args.matchExisting) {
        const remaining: ConnectorTransactionInput[] = [];
        for (const tx of candidates) {
            const bucket = existingByAmount.get(amountKey(tx.amount)) || [];
            let matched: { date: string; used: boolean } | undefined;
            // Revolut books a card payment up to two days after the local
            // ledger's started date. Prefer the exact day, then nearby days.
            for (const offset of [0, -1, 1, -2, 2]) {
                const target = shiftDate(tx.date, offset);
                matched = bucket.find((item) => !item.used && item.date === target);
                if (matched) break;
            }
            if (matched) {
                matched.used = true;
                matchedExisting++;
                continue;
            }
            remaining.push(tx);
        }
        candidates = remaining;
    }

    const replacement = replaceApiRows(
        candidates,
        accountRows.map((tx) => ({
            id: String(tx.id),
            date: String(tx.date),
            amount: Number(tx.amount),
            category: tx.category,
            externalId: tx.externalId,
        })),
    );
    candidates = replacement.rows;
    const replacedApiRows = replacement.deleteIds;

    candidates.sort((a, b) => a.date.localeCompare(b.date));
    const netSum = Math.round(candidates.reduce((sum, tx) => sum + tx.amount, 0) * 100) / 100;

    console.error(
        `[revolut] parsed=${parsed.length} currency-skipped=${currencySkipped} since=${since || 'beginning'} matched-existing=${matchedExisting} to-import=${candidates.length} net=${netSum}`,
    );

    const summary: any = {
        source: 'revolut-csv',
        accountId: args.accountId,
        accountName: account.name,
        parsed: parsed.length,
        parseSkipped,
        currencySkipped,
        since: since || null,
        matchedExisting,
        replacedApiRows: replacedApiRows.length,
        toImport: candidates.length,
        netSum,
        imported: 0,
        skipped: 0,
        assert: null,
    };

    if (args.dryRun) {
        summary.sample = candidates.slice(0, 8);
        console.log(JSON.stringify(summary, null, 2));
        return;
    }

    if (replacedApiRows.length > 0) {
        const now = Date.now();
        await apiRequest(args, 'POST', '/api/sync/push', {
            events: replacedApiRows.map((id, index) => ({
                eventId: `connector:revolut-csv:replace:${id}`,
                deviceId: 'connector:revolut-csv',
                counter: index + 1,
                timestamp: now + index,
                type: 'TRANSACTION_DELETED',
                payload: { id },
            })),
        });
        console.error(`[revolut] replaced ${replacedApiRows.length} rows from the bank API`);
    }

    for (let i = 0; i < candidates.length; i += args.batchSize) {
        const batch = candidates.slice(i, i + args.batchSize);
        const result = await apiRequest(args, 'POST', '/api/connectors/transactions', {
            source: 'revolut-csv',
            accountId: args.accountId,
            account: account.name,
            transactions: batch,
        });
        summary.imported += Number(result.imported || 0);
        summary.skipped += Number(result.skipped || 0);
        console.error(
            `[revolut] batch ${Math.floor(i / args.batchSize) + 1}: +${result.imported} imported, ${result.skipped} skipped`,
        );
    }

    if (args.assertLatest) {
        const latest = parsed
            .filter((tx) => tx.balance !== undefined)
            .sort((a, b) => a.date.localeCompare(b.date))
            .pop();
        if (latest) {
            summary.assert = await apiRequest(args, 'POST', '/api/connectors/assert', {
                source: 'revolut-csv',
                accountId: args.accountId,
                date: latest.date,
                value: latest.balance,
                currency: latest.currency,
            });
        }
    }

    console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
    console.error('[revolut] ERROR:', error.message || error);
    process.exit(1);
});
