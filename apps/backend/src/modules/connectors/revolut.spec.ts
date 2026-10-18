import { describe, expect, it } from 'vitest';
import { parseRevolutCsv } from './revolut';

const SAMPLE = `\uFEFFType,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
Deposit,Current,2018-08-07 17:53:08,,Top-up by *6639,1.00,0.00,PLN,REVERTED,
Deposit,Current,2018-08-07 17:53:28,2018-08-07 17:54:03,Top-up by *6639,20.00,0.00,PLN,COMPLETED,20.00
Card Payment,Current,2022-02-12 14:33:45,2022-02-12 14:33:45,Tal Lira Hotels,-205.64,2.06,PLN,COMPLETED,1743.84
Card Payment,Current,2026-10-17 09:16:21,2026-10-18 13:47:57,Bolt,-21.73,0.00,PLN,COMPLETED,974.63
Card Payment,Current,2026-10-18 08:22:13,,Hetzner,-187.50,0.00,PLN,PENDING,
`;

describe('Revolut CSV parser', () => {
    it('imports only COMPLETED rows and subtracts the fee from the gross amount', () => {
        const result = parseRevolutCsv(SAMPLE);

        expect(result.skipped).toBe(2);
        expect(result.transactions).toHaveLength(3);

        expect(result.transactions[0]).toMatchObject({
            date: '2018-08-07',
            amount: 20,
            currency: 'PLN',
            balance: 20,
            payee: 'Top-up by *6639',
            memo: 'Deposit',
            clearedStatus: 'X',
        });

        // -205.64 gross - 2.06 fee = -207.70, matching the running balance.
        expect(result.transactions[1]).toMatchObject({
            date: '2022-02-12',
            amount: -207.7,
            balance: 1743.84,
            payee: 'Tal Lira Hotels',
        });

        expect(result.transactions[2]).toMatchObject({
            date: '2026-10-18',
            amount: -21.73,
            balance: 974.63,
            payee: 'Bolt',
        });
    });

    it('rejects a CSV without the Revolut header', () => {
        expect(() => parseRevolutCsv('date,amount\n2026-10-18,-21.73\n')).toThrow(
            /missing Type \/ Started Date header/,
        );
    });
});
