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
        const amount = Math.round((grossAmount - fee) * 100) / 100;
        if (!Number.isFinite(amount)) {
            skipped++;
            continue;
        }

        const balanceRaw = cell(row, idx.balance);
        const currency = cell(row, idx.currency);

        transactions.push({
            date,
            amount,
            payee: cell(row, idx.description) || undefined,
            memo: cell(row, idx.type) || undefined,
            currency: currency || undefined,
            balance: balanceRaw ? parseAmount(balanceRaw) : undefined,
            clearedStatus: 'X',
            raw: {
                type: cell(row, idx.type) || undefined,
                product: cell(row, idx.product) || undefined,
                startedDate: cell(row, idx.startedDate) || undefined,
                completedDate: cell(row, idx.completedDate) || undefined,
                state: cell(row, idx.state) || undefined,
                grossAmount,
                fee,
            },
        });
    }

    return { transactions, skipped };
}
