import { describe, it, expect } from 'vitest';
import { parseAmount, computeAmount, titleMatchToTransactionKey } from '~/utils/transactionImport';
import type { UploadTransactionsHeaderType } from '~/components/account/UploadTransactionsHeaderType';

describe('parseAmount', () => {
    it('parses plain number', () => {
        expect(parseAmount('250.00')).toBe(250);
    });

    it('parses negative number', () => {
        expect(parseAmount('-26.00')).toBe(-26);
    });

    it('parses comma as decimal separator (Polish format)', () => {
        expect(parseAmount('250,00')).toBe(250);
    });

    it('returns 0 for empty string', () => {
        expect(parseAmount('')).toBe(0);
    });

    it('strips whitespace and non-numeric chars', () => {
        expect(parseAmount(' 1500.00 ')).toBe(1500);
    });
});

describe('computeAmount', () => {
    function makeHeaderMap(overrides: Partial<Record<UploadTransactionsHeaderType, number>>): Record<UploadTransactionsHeaderType, number> {
        return {
            amount: NaN,
            in: NaN,
            out: NaN,
            date: 0,
            category: NaN,
            payee: NaN,
            memo: NaN,
            fee: NaN,
            clearedStatus: NaN,
            account: NaN,
            accountId: NaN,
            ...overrides,
        } as Record<UploadTransactionsHeaderType, number>;
    }

    it('credit in "in" column returns positive amount', () => {
        const row = ['2025-12-30', '', '250.00'];
        const headerMap = makeHeaderMap({ in: 2 });
        expect(computeAmount(row, headerMap)).toBe(250);
    });

    it('debit in "out" column returns negative amount', () => {
        const row = ['2025-12-28', '26.00', ''];
        const headerMap = makeHeaderMap({ out: 1 });
        expect(computeAmount(row, headerMap)).toBe(-26);
    });

    it('negative value in "out" column still returns negative (abs applied)', () => {
        const row = ['2025-12-28', '-26.00', ''];
        const headerMap = makeHeaderMap({ out: 1 });
        expect(computeAmount(row, headerMap)).toBe(-26);
    });

    it('negative value in "in" column still returns positive (abs applied)', () => {
        const row = ['2025-12-30', '', '-250.00'];
        const headerMap = makeHeaderMap({ in: 2 });
        expect(computeAmount(row, headerMap)).toBe(250);
    });

    it('falls back to "amount" column when no in/out', () => {
        const row = ['2025-12-28', '-19.30'];
        const headerMap = makeHeaderMap({ amount: 1 });
        expect(computeAmount(row, headerMap)).toBe(-19.3);
    });

    it('prefers "in" over "amount"', () => {
        const row = ['2025-12-28', '100.00', '200.00'];
        const headerMap = makeHeaderMap({ amount: 1, in: 2 });
        expect(computeAmount(row, headerMap)).toBe(200);
    });

    it('handles both in and out columns with credit value', () => {
        // Millennium CSV: empty Obciążenia, filled Uznania
        const row = ['2025-12-30', '', '250.00', '3904.01'];
        const headerMap = makeHeaderMap({ out: 1, in: 2 });
        expect(computeAmount(row, headerMap)).toBe(250);
    });

    it('handles both in and out columns with debit value', () => {
        // Millennium CSV: filled Obciążenia, empty Uznania
        const row = ['2025-12-28', '-26.00', '', '3654.01'];
        const headerMap = makeHeaderMap({ out: 1, in: 2 });
        expect(computeAmount(row, headerMap)).toBe(-26);
    });
});

describe('titleMatchToTransactionKey', () => {
    it('maps "Uznania" to in', () => {
        expect(titleMatchToTransactionKey('Uznania', 'in')).toBe(true);
    });

    it('maps "Credits" to in', () => {
        expect(titleMatchToTransactionKey('Credits', 'in')).toBe(true);
    });

    it('maps "Paid In" to in', () => {
        expect(titleMatchToTransactionKey('Paid In', 'in')).toBe(true);
    });

    it('maps "Obciążenia" to out', () => {
        expect(titleMatchToTransactionKey('Obciążenia', 'out')).toBe(true);
    });

    it('maps "Debits" to out', () => {
        expect(titleMatchToTransactionKey('Debits', 'out')).toBe(true);
    });

    it('maps "Paid Out" to out', () => {
        expect(titleMatchToTransactionKey('Paid Out', 'out')).toBe(true);
    });

    it('does NOT map "Obciążenia" to amount', () => {
        expect(titleMatchToTransactionKey('Obciążenia', 'amount')).toBe(false);
    });

    it('does NOT map "Paid Out" to amount', () => {
        expect(titleMatchToTransactionKey('Paid Out', 'amount')).toBe(false);
    });

    it('maps "#Kwota" to amount', () => {
        expect(titleMatchToTransactionKey('#Kwota', 'amount')).toBe(true);
    });

    it('maps "Amount" to amount', () => {
        expect(titleMatchToTransactionKey('Amount', 'amount')).toBe(true);
    });

    it('maps "Data transakcji" to date', () => {
        expect(titleMatchToTransactionKey('Data transakcji', 'date')).toBe(true);
    });

    it('maps "Opis" to memo', () => {
        expect(titleMatchToTransactionKey('Opis', 'memo')).toBe(true);
    });

    it('maps "Odbiorca/Zleceniodawca" to payee', () => {
        expect(titleMatchToTransactionKey('Odbiorca/Zleceniodawca', 'payee')).toBe(true);
    });

    it('maps "Rodzaj transakcji" to category', () => {
        expect(titleMatchToTransactionKey('Rodzaj transakcji', 'category')).toBe(true);
    });
});
