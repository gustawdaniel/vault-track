import { describe, it, expect } from 'vitest';
import { exportTransactionsCsv } from '~/utils/exportTransactionsCsv';
import type { FullTransaction } from '~/store/transaction.model';

function makeTx(overrides: Partial<FullTransaction>): FullTransaction {
    return {
        id: 'tx1',
        account: 'Test',
        accountId: 'acc1',
        amount: 0,
        date: '2025-12-30',
        hash: 'abc',
        ...overrides,
    };
}

describe('exportTransactionsCsv', () => {
    it('generates correct headers', () => {
        const csv = exportTransactionsCsv([]);
        expect(csv).toBe('"Date","Payee","Category","Memo","Obciążenia","Uznania"');
    });

    it('exports credit (positive amount) to Uznania column', () => {
        const csv = exportTransactionsCsv([
            makeTx({ amount: 250, payee: 'Sender', memo: 'Payment' }),
        ]);
        const lines = csv.split('\n');
        expect(lines).toHaveLength(2);
        expect(lines[1]).toBe('"2025-12-30","Sender","","Payment","","250.00"');
    });

    it('exports debit (negative amount) to Obciążenia column as absolute value', () => {
        const csv = exportTransactionsCsv([
            makeTx({ amount: -26, payee: 'Shop' }),
        ]);
        const lines = csv.split('\n');
        expect(lines[1]).toBe('"2025-12-30","Shop","","","26.00",""');
    });

    it('escapes commas and quotes in values', () => {
        const csv = exportTransactionsCsv([
            makeTx({ amount: 100, payee: 'A "quoted" name', memo: 'a, b, c' }),
        ]);
        const lines = csv.split('\n');
        expect(lines[1]).toContain('"A ""quoted"" name"');
        expect(lines[1]).toContain('"a, b, c"');
    });

    it('handles multiple transactions', () => {
        const csv = exportTransactionsCsv([
            makeTx({ amount: 250, date: '2025-12-30' }),
            makeTx({ amount: -26, date: '2025-12-28' }),
            makeTx({ amount: -19.3, date: '2025-12-26' }),
        ]);
        const lines = csv.split('\n');
        expect(lines).toHaveLength(4); // header + 3 rows
    });

    it('handles zero amount (neither in nor out)', () => {
        const csv = exportTransactionsCsv([
            makeTx({ amount: 0 }),
        ]);
        const lines = csv.split('\n');
        expect(lines[1]).toBe('"2025-12-30","","","","",""');
    });

    it('handles missing optional fields gracefully', () => {
        const csv = exportTransactionsCsv([
            makeTx({ amount: 100 }),
        ]);
        const lines = csv.split('\n');
        // payee, category, memo should be empty strings
        expect(lines[1]).toBe('"2025-12-30","","","","","100.00"');
    });
});
