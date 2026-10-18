import crypto from 'node:crypto';
import { ConnectorTransactionInput, normalizeText } from './service';
import { parseCsv } from './millennium';

export interface MbankParseResult {
    transactions: ConnectorTransactionInput[];
    skipped: number;
}

function parseMbankAmount(value: string): number {
    const text = normalizeText(value)
        .replace(/PLN/gi, '')
        .replace(/\s+/g, '')
        .replace(',', '.');
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
}

function cleanPayee(description: string): string {
    // mBank separates the counterparty from transfer details with runs of spaces.
    const first = description.split(/\s{2,}/)[0].trim();
    return first.replace(/[,\s]+$/, '').slice(0, 120);
}

/**
 * Parses an mBank "Lista operacji" export.
 *
 * The file starts with a free-form preamble and several `#` sections. The
 * transaction table begins at `#Data operacji` and is semicolon-delimited:
 * data; opis; rachunek; kategoria; kwota; saldo po operacji
 */
export function parseMbankCsv(text: string): MbankParseResult {
    const rows = parseCsv(text.replace(/^\uFEFF/, ''), ';');
    const headerIndex = rows.findIndex((row) =>
        normalizeText(row[0] || '').toLowerCase() === '#data operacji',
    );

    if (headerIndex === -1) {
        throw new Error('mBank CSV: missing "#Data operacji" header row');
    }

    const transactions: ConnectorTransactionInput[] = [];
    const seen = new Map<string, number>();
    let skipped = 0;

    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every((value) => !normalizeText(value))) continue;

        const date = normalizeText(row[0] || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            skipped++;
            continue;
        }

        const amountRaw = normalizeText(row[4] || '');
        const balanceRaw = normalizeText(row[5] || '');
        if (!amountRaw) {
            skipped++;
            continue;
        }

        const rawDescription = row[1] || '';
        const description = normalizeText(rawDescription);
        const accountLabel = normalizeText(row[2] || '');
        const category = normalizeText(row[3] || '');
        const payee = cleanPayee(rawDescription);
        const amount = parseMbankAmount(amountRaw);
        const balance = balanceRaw ? parseMbankAmount(balanceRaw) : undefined;

        // Two genuinely identical operations can appear on the same day (e.g.
        // two -300 BLIK payments with the same running balance). Give the
        // duplicate a stable distinct external id; otherwise the fingerprint
        // dedupe would drop it.
        const baseKey = `${date}|${amount}|${description}|${balanceRaw}`;
        const occurrence = seen.get(baseKey) || 0;
        seen.set(baseKey, occurrence + 1);
        const externalId = occurrence === 0
            ? undefined
            : `mbank-dup:${crypto.createHash('sha256').update(baseKey).digest('hex').slice(0, 16)}:${occurrence}`;

        transactions.push({
            date,
            amount,
            payee: payee || undefined,
            memo: description.length > payee.length + 5 ? description : undefined,
            category: category || undefined,
            currency: 'PLN',
            balance,
            clearedStatus: 'X',
            externalId,
            raw: {
                connector: 'mbank',
                description,
                accountLabel,
                category,
                balance,
                currency: 'PLN',
            },
        });
    }

    return { transactions, skipped };
}
