import { ConnectorTransactionInput, normalizeText, parseAmount } from './service';
import { parseCsv } from './millennium';

export interface RevolutParseResult {
    transactions: ConnectorTransactionInput[];
    skipped: number;
}

function columnIndex(headers: string[], name: string): number {
    return headers.findIndex((header) => normalizeText(header).toLowerCase() === name.toLowerCase());
}

function cell(row: string[], index: number): string {
    return index >= 0 ? normalizeText(row[index]) : '';
}

/**
 * Parses a Revolut account statement export.
 *
 * Columns:
 * Type, Product, Started Date, Completed Date, Description, Amount, Fee,
 * Currency, State, Balance
 *
 * Revolut reports the gross amount and a separate fee. The balance changes by
 * `Amount - Fee`, so that is the amount stored in the ledger.
 */
export const REVOLUT_FEE_CATEGORY = 'Financial:Bank fees';

export function parseRevolutCsv(text: string): RevolutParseResult {
    const rows = parseCsv(text.replace(/^\uFEFF/, ''));
    const headerIndex = rows.findIndex((row) =>
        row.some((value) => normalizeText(value) === 'Type') &&
        row.some((value) => normalizeText(value) === 'Started Date'),
    );

    if (headerIndex === -1) {
        throw new Error('Revolut CSV: missing Type / Started Date header row');
    }

    const headers = rows[headerIndex];
    const idx = {
        type: columnIndex(headers, 'Type'),
        product: columnIndex(headers, 'Product'),
        startedDate: columnIndex(headers, 'Started Date'),
        completedDate: columnIndex(headers, 'Completed Date'),
        description: columnIndex(headers, 'Description'),
        amount: columnIndex(headers, 'Amount'),
        fee: columnIndex(headers, 'Fee'),
        currency: columnIndex(headers, 'Currency'),
        state: columnIndex(headers, 'State'),
        balance: columnIndex(headers, 'Balance'),
    };

    if (idx.startedDate === -1 || idx.amount === -1 || idx.state === -1) {
        throw new Error('Revolut CSV: missing required date/amount/state columns');
    }

    const transactions: ConnectorTransactionInput[] = [];
    let skipped = 0;

    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every((value) => !normalizeText(value))) continue;

        // Only booked transactions belong in the ledger. REVERTED / PENDING /
        // FAILED rows are skipped until the bank confirms them.
        if (cell(row, idx.state) !== 'COMPLETED') {
            skipped++;
            continue;
        }

        const date = (cell(row, idx.completedDate) || cell(row, idx.startedDate)).slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            skipped++;
            continue;
        }

        const grossAmount = parseAmount(cell(row, idx.amount));
        const fee = Math.abs(parseAmount(cell(row, idx.fee)));
        if (!Number.isFinite(grossAmount) || !Number.isFinite(fee)) {
            skipped++;
            continue;
        }

        const balanceRaw = cell(row, idx.balance);
        const balance = balanceRaw ? parseAmount(balanceRaw) : undefined;
        const currency = cell(row, idx.currency);
        const payee = cell(row, idx.description) || undefined;
        const raw = {
            type: cell(row, idx.type) || undefined,
            product: cell(row, idx.product) || undefined,
            startedDate: cell(row, idx.startedDate) || undefined,
            completedDate: cell(row, idx.completedDate) || undefined,
            state: cell(row, idx.state) || undefined,
            grossAmount,
            fee,
        };

        // The price and the cost of moving or converting money are kept apart: the operation at its gross
        // amount, the fee as its own row. Together they change the balance by Amount - Fee.
        transactions.push({
            date,
            amount: Math.round(grossAmount * 100) / 100,
            payee,
            memo: cell(row, idx.type) || undefined,
            currency: currency || undefined,
            balance: balance !== undefined && fee > 0 ? Math.round((balance + fee) * 100) / 100 : balance,
            clearedStatus: 'X',
            raw,
        });
        if (fee > 0) {
            transactions.push({
                date,
                amount: -fee,
                payee: `Revolut — opłata: ${payee ?? ''}`.trim(),
                memo: 'Opłata Revolut',
                category: REVOLUT_FEE_CATEGORY,
                currency: currency || undefined,
                balance,
                clearedStatus: 'X',
                raw: { ...raw, feeOf: payee },
            });
        }
    }

    return { transactions, skipped };
}

interface ExistingRow {
    id: string;
    date: string;
    amount: number;
    category?: string;
    externalId?: string;
}

function dayDistance(a: string, b: string): number {
    return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

/**
 * The export replaces what the bank API brought for the same operations: Revolut's API gives one amount with the
 * fee inside, the export gives the price and the fee apart. An API row matches an operation when its amount is
 * the operation's net (gross - fee) within 3 days; it is deleted and its category (the user's choice) moves to the
 * operation's main row. Fee rows keep the fee category.
 */
export function replaceApiRows(
    rows: ConnectorTransactionInput[],
    existing: ExistingRow[],
    apiPrefix = 'enablebanking:revolut',
): { rows: ConnectorTransactionInput[]; deleteIds: string[] } {
    const api = existing.filter((e) => (e.externalId ?? '').startsWith(apiPrefix));
    const used = new Set<string>();
    const out = rows.map((tx) => ({ ...tx }));
    for (const tx of out) {
        if ((tx.raw as any)?.feeOf !== undefined) continue;
        const fee = Number((tx.raw as any)?.fee ?? 0);
        const net = Math.round((tx.amount - fee) * 100) / 100;
        const match = api
            .filter((e) => !used.has(e.id) && Math.abs(e.amount - net) < 0.005 && dayDistance(e.date, tx.date) <= 3)
            .sort((a, b) => dayDistance(a.date, tx.date) - dayDistance(b.date, tx.date))[0];
        if (!match) continue;
        used.add(match.id);
        if (!tx.category && match.category) tx.category = match.category;
    }
    return { rows: out, deleteIds: [...used] };
}
