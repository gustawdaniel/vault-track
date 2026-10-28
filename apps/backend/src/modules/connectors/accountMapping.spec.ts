import { describe, expect, it } from 'vitest';
import { mapBankAccounts } from './accountMapping';

describe('mapBankAccounts', () => {
    it('maps every account of one mBank consent by the number in the description', () => {
        const mapping = mapBankAccounts(
            'mBank',
            [
                { uid: 'a', identifier: 'PL00114020040000350279910001', currency: 'PLN' },
                { uid: 'b', identifier: 'PL00114020040000390275900002', currency: 'PLN' },
                { uid: 'c', identifier: 'PL00114020040000301221800003', currency: 'EUR' },
            ],
            [
                { id: 'firm', name: 'mBank Firmowe', currency: 'PLN', description: '00 1140 2004 0000 3502 7991 0001 (mBank mBiznes)' },
                { id: 'priv', name: 'mBank Prywatne', currency: 'PLN', description: '00 1140 2004 0000 3902 7590 0002 (mBank)' },
                { id: 'mill', name: 'Millennium Bank', currency: 'PLN', description: '00 1160 2202 0000 0002 2859 0004' },
            ],
        );
        expect(mapping).toEqual([
            { uid: 'a', vaulttrackAccountId: 'firm', how: 'number' },
            { uid: 'b', vaulttrackAccountId: 'priv', how: 'number' },
        ]);
    });

    it('tells currency pockets behind one IBAN apart and fills the rest by bank and currency', () => {
        const mapping = mapBankAccounts(
            'Revolut',
            [
                { uid: 'eur', identifier: 'LT003250073209945700', currency: 'EUR' },
                { uid: 'pln', identifier: 'LT003250073209945700', currency: 'PLN' },
                { uid: 'usd', identifier: 'LT003250073209945700', currency: 'USD' },
                { uid: 'local', identifier: 'PL00102000060000000002545801', currency: 'PLN' },
            ],
            [
                { id: 'rpln', name: 'Revolut PLN', currency: 'PLN', description: 'IBAN LT00 3250 0732 0994 5700.' },
                { id: 'reur', name: 'Revolut EUR', currency: 'EUR', description: '' },
                { id: 'rusd', name: 'Revolut USD', currency: 'USD', description: null },
                { id: 'rgbp', name: 'Revolut GBP', currency: 'GBP', description: '' },
            ],
        );
        expect(mapping).toEqual([
            { uid: 'pln', vaulttrackAccountId: 'rpln', how: 'number' },
            { uid: 'eur', vaulttrackAccountId: 'reur', how: 'bank-and-currency' },
            { uid: 'usd', vaulttrackAccountId: 'rusd', how: 'bank-and-currency' },
        ]);
    });

    it('leaves an account alone when the currency is ambiguous', () => {
        const mapping = mapBankAccounts(
            'Wise',
            [
                { uid: 'w1', identifier: 'BE00123456789001', currency: 'EUR' },
                { uid: 'w2', identifier: '12345678', currency: 'EUR' },
            ],
            [{ id: 'weur', name: 'Wise Eur', currency: 'EUR' }],
        );
        expect(mapping).toEqual([]);
    });

    it('does not guess by currency for an account another consent already feeds', () => {
        const mapping = mapBankAccounts(
            'Wise',
            [{ uid: 'company-eur', identifier: 'BE00123', currency: 'EUR' }],
            [{ id: 'weur', name: 'Wise Eur', currency: 'EUR', fedElsewhere: true }],
        );
        expect(mapping).toEqual([]);
    });

    it('never guesses by currency for an account that has its own number (the VAT account is not in the API)', () => {
        const mapping = mapBankAccounts(
            'mBank',
            [{ uid: 'other', identifier: 'PL00114020040000385090700009', currency: 'PLN' }],
            [{ id: 'vat', name: 'mBank Firmowe VAT', currency: 'PLN', description: '00 1140 2004 0000 3503 0072 0009 (rachunek VAT)' }],
        );
        expect(mapping).toEqual([]);
    });
});
