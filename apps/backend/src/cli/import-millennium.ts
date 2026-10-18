#!/usr/bin/env node
/**
 * Millennium Bank CSV connector.
 *
 * Usage:
 *   pnpm --filter backend import:millennium -- \
 *     --file ~/Downloads/Historia_transakcji.csv \
 *     --account-id d46d0228634 \
 *     --group-id <sha256-of-mnemonic> \
 *     --api http://localhost:4500
 *
 * Options:
 *   --file <path>        CSV export (repeatable)
 *   --account-id <id>    VaultTrack account id
 *   --group-id <id>      X-Sync-Group-ID (or SYNC_GROUP_ID env)
 *   --mnemonic "<12 words>"  Derive the group id from the sync mnemonic
 *   --api <url>          Backend base URL (default http://localhost:4500)
 *   --since <YYYY-MM-DD> Import from this date (default: day after last known tx)
 *   --backfill           Ignore the default since cutoff
 *   --no-match-existing  Do not skip rows matching existing date+amount
 *   --dry-run            Parse and report without sending anything
 *   --assert-latest      Also create/update a balance assert from the newest row
 *   --batch-size <n>     Transactions per request (default 500)
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseMillenniumCsv } from '../modules/connectors/millennium';
import { ConnectorTransactionInput } from '../modules/connectors/service';

interface Args {
    files: string[];
    accountId?: string;
    groupId?: string;
    mnemonic?: string;
    api: string;
    since?: string;
    backfill: boolean;
    matchExisting: boolean;
    dryRun: boolean;
    assertLatest: boolean;
    batchSize: number;
}

function parseArgs(argv: string[]): Args {
    const args: Args = {
        files: [],
        api: 'http://localhost:4500',
        backfill: false,
        matchExisting: true,
        dryRun: false,
        assertLatest: false,
        batchSize: 500,
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--') continue;
        switch (arg) {
            case '--file':
                args.files.push(argv[++i]);
                break;
            case '--account-id':
                args.accountId = argv[++i];
                break;
            case '--group-id':
                args.groupId = argv[++i];
                break;
            case '--mnemonic':
                args.mnemonic = argv[++i];
                break;
            case '--api':
                args.api = argv[++i];
                break;
            case '--since':
                args.since = argv[++i];
                break;
            case '--backfill':
                args.backfill = true;
                break;
            case '--no-match-existing':
                args.matchExisting = false;
                break;
            case '--dry-run':
                args.dryRun = true;
                break;
            case '--assert-latest':
                args.assertLatest = true;
                break;
            case '--batch-size':
                args.batchSize = Math.max(1, Number(argv[++i]) || 500);
                break;
            case '--help':
            case '-h':
                console.log(fs.readFileSync(__filename, 'utf-8').split('*/')[0]);
                process.exit(0);
                break;
            default:
                throw new Error(`Unknown argument: ${arg}`);
        }
    }

    if (!args.groupId && args.mnemonic) {
        args.groupId = crypto
            .createHash('sha256')
            .update(args.mnemonic.trim())
            .digest('hex');
    }
    args.groupId = args.groupId || process.env.SYNC_GROUP_ID;
    if (args.files.length === 0) throw new Error('At least one --file is required');
    if (!args.accountId) throw new Error('--account-id is required');
    if (!args.groupId) throw new Error('--group-id, --mnemonic or SYNC_GROUP_ID is required');

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

function nextDay(date: string): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
}

function amountKey(date: string, amount: number): string {
    return `${date}|${Number(amount).toFixed(2)}`;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const snapshot: any = await apiRequest(args, 'GET', '/api/sync/snapshot');
    const accounts: any[] = snapshot.accounts || [];
    const account = accounts.find((item) => String(item.id) === args.accountId);
    if (!account) {
        throw new Error(`Account ${args.accountId} not found in backend snapshot`);
    }

    const existing: any[] = (snapshot.transactions || []).filter(
        (tx: any) => String(tx.accountId) === args.accountId,
    );

    const parsed = args.files.flatMap((file) => {
        const fullPath = path.resolve(file);
        const text = fs.readFileSync(fullPath, 'utf-8');
        const result = parseMillenniumCsv(text);
        console.error(
            `[millennium] ${path.basename(fullPath)}: ${result.transactions.length} rows, ${result.skipped} skipped, IBAN ${result.iban || '?'}`,
        );
        return result.transactions;
    });

    let since = args.since;
    if (!since && !args.backfill && existing.length > 0) {
        const maxDate = existing
            .map((tx) => String(tx.date))
            .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
            .sort()
            .pop();
        if (maxDate) since = nextDay(maxDate);
        console.error(`[millennium] no --since given, starting after last known transaction: ${since}`);
    }

    let candidates = since
        ? parsed.filter((tx) => tx.date >= since!)
        : parsed;

    const existingCounts = new Map<string, number>();
    for (const tx of existing) {
        const key = amountKey(String(tx.date), Number(tx.amount));
        existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
    }

    let matchedExisting = 0;
    if (args.matchExisting) {
        const remaining: ConnectorTransactionInput[] = [];
        for (const tx of candidates) {
            const key = amountKey(tx.date, tx.amount);
            const count = existingCounts.get(key) || 0;
            if (count > 0) {
                existingCounts.set(key, count - 1);
                matchedExisting++;
                continue;
            }
            remaining.push(tx);
        }
        candidates = remaining;
    }

    candidates.sort((a, b) => a.date.localeCompare(b.date));
    console.error(
        `[millennium] parsed=${parsed.length} since=${since || 'beginning'} matched-existing=${matchedExisting} to-import=${candidates.length}`,
    );

    const summary: any = {
        source: 'millennium',
        accountId: args.accountId,
        parsed: parsed.length,
        since: since || null,
        matchedExisting,
        toImport: candidates.length,
        imported: 0,
        skipped: 0,
        assert: null,
    };

    if (args.dryRun) {
        summary.sample = candidates.slice(0, 5);
        console.log(JSON.stringify(summary, null, 2));
        return;
    }

    for (let i = 0; i < candidates.length; i += args.batchSize) {
        const batch = candidates.slice(i, i + args.batchSize);
        const result = await apiRequest(args, 'POST', '/api/connectors/transactions', {
            source: 'millennium',
            accountId: args.accountId,
            account: account.name,
            transactions: batch,
        });
        summary.imported += Number(result.imported || 0);
        summary.skipped += Number(result.skipped || 0);
        console.error(
            `[millennium] batch ${Math.floor(i / args.batchSize) + 1}: +${result.imported} imported, ${result.skipped} skipped`,
        );
    }

    if (args.assertLatest && parsed.length > 0) {
        const latest = parsed
            .filter((tx) => tx.balance !== undefined)
            .sort((a, b) => a.date.localeCompare(b.date))
            .pop();
        if (latest) {
            summary.assert = await apiRequest(args, 'POST', '/api/connectors/assert', {
                source: 'millennium',
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
    console.error('[millennium] ERROR:', error.message || error);
    process.exit(1);
});
