import {
    ConnectorTransactionInput,
    normalizeText,
    parseAmount,
} from './service';

export interface MillenniumParseResult {
    iban: string;
    currency: string;
    transactions: ConnectorTransactionInput[];
    skipped: number;
}

/**
 * Minimal RFC4180 CSV parser: quoted fields, escaped quotes, CRLF and newlines
 * inside quoted values. Millennium exports use a UTF-8 BOM and comma delimiter.
 */
export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(field);
            field = '';
        } else if (ch === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else if (ch === '\r') {
            // ignore; \n terminates the row
        } else {
            field += ch;
        }
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows;
}

function normalizeDate(value: string): string | null {
    const text = normalizeText(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    const dotted = text.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
    if (dotted) {
        const [, day, month, year] = dotted;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
}

function columnIndex(headers: string[], name: string): number {
    return headers.findIndex((header) => normalizeText(header).toLowerCase() === name.toLowerCase());
}

function cell(row: string[], index: number): string {
    return index >= 0 ? normalizeText(row[index]) : '';
}

/**
 * Parses a Millennium Bank (PL) transaction history export.
 *
 * Columns:
 * Numer rachunku/karty, Data transakcji, Data rozliczenia, Rodzaj transakcji,
 * Na konto/Z konta, Odbiorca/Zleceniodawca, Opis, Obciążenia, Uznania, Saldo, Waluta
 */
export function parseMillenniumCsv(text: string): MillenniumParseResult {
    const clean = text.replace(/^\uFEFF/, '');
    const rows = parseCsv(clean);

    const headerIndex = rows.findIndex((row) =>
        row.some((value) => normalizeText(value).includes('Numer rachunku/karty')),
    );
    if (headerIndex === -1) {
        throw new Error('Millennium CSV: missing "Numer rachunku/karty" header row');
    }

    const headers = rows[headerIndex];
    const idx = {
        iban: columnIndex(headers, 'Numer rachunku/karty'),
        date: columnIndex(headers, 'Data transakcji'),
        settlementDate: columnIndex(headers, 'Data rozliczenia'),
        type: columnIndex(headers, 'Rodzaj transakcji'),
        counterpartyAccount: columnIndex(headers, 'Na konto/Z konta'),
        payee: columnIndex(headers, 'Odbiorca/Zleceniodawca'),
        memo: columnIndex(headers, 'Opis'),
        debit: columnIndex(headers, 'Obciążenia'),
        credit: columnIndex(headers, 'Uznania'),
        balance: columnIndex(headers, 'Saldo'),
        currency: columnIndex(headers, 'Waluta'),
    };

    if (idx.date === -1 || (idx.debit === -1 && idx.credit === -1)) {
        throw new Error('Millennium CSV: missing required date/debit/credit columns');
    }

    const transactions: ConnectorTransactionInput[] = [];
    let iban = '';
    let currency = '';
    let skipped = 0;

    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every((value) => !normalizeText(value))) continue;

        const rowIban = cell(row, idx.iban);
        if (rowIban) iban = rowIban;

        const date = normalizeDate(cell(row, idx.date));
        if (!date) {
            skipped++;
            continue;
        }

        const debitRaw = cell(row, idx.debit);
        const creditRaw = cell(row, idx.credit);
        const debit = parseAmount(debitRaw);
        const credit = parseAmount(creditRaw);

        let amount = 0;
        if (creditRaw && credit !== 0) {
            amount = credit;
        } else if (debitRaw) {
            amount = -Math.abs(debit);
        } else if (creditRaw) {
            amount = credit;
        }
        if (amount === 0 && !creditRaw && !debitRaw) {
            skipped++;
            continue;
        }

        const rowCurrency = cell(row, idx.currency);
        if (rowCurrency) currency = rowCurrency;

        transactions.push({
            date,
            amount,
            payee: cell(row, idx.payee) || undefined,
            memo: cell(row, idx.memo) || undefined,
            currency: rowCurrency || undefined,
            balance: idx.balance >= 0 ? parseAmount(cell(row, idx.balance)) : undefined,
            raw: {
                type: cell(row, idx.type) || undefined,
                settlementDate: normalizeDate(cell(row, idx.settlementDate)) || undefined,
                counterpartyAccount: cell(row, idx.counterpartyAccount) || undefined,
                iban: rowIban || undefined,
            },
        });
    }

    return {
        iban,
        currency,
        transactions,
        skipped,
    };
}
