import { describe, expect, it } from 'vitest';
import { mapBankAccounts } from './accountMapping';

describe('mapBankAccounts', () => {
    it('maps every account of one mBank consent by the number in the description', () => {
        const mapping = mapBankAccounts(
            'mBank',
            [
                { uid: 'a', identifier: 'PL22114020040000350279911652', currency: 'PLN' },
                { uid: 'b', identifier: 'PL13114020040000390275905033', currency: 'PLN' },
                { uid: 'c', identifier: 'PL52114020040000301221841788', currency: 'EUR' },
            ],
            [
                { id: 'firm', name: 'mBank Firmowe', currency: 'PLN', description: '22 1140 2004 0000 3502 7991 1652 (mBank mBiznes)' },
                { id: 'priv', name: 'mBank Prywatne', currency: 'PLN', description: '13 1140 2004 0000 3902 7590 5033 (mBank)' },
                { id: 'mill', name: 'Millennium Bank', currency: 'PLN', description: '90 1160 2202 0000 0002 2859 6562' },
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
                { uid: 'eur', identifier: 'LT543250073209945743', currency: 'EUR' },
                { uid: 'pln', identifier: 'LT543250073209945743', currency: 'PLN' },
                { uid: 'usd', identifier: 'LT543250073209945743', currency: 'USD' },
                { uid: 'local', identifier: 'PL10291000060000000002545867', currency: 'PLN' },
            ],
            [
                { id: 'rpln', name: 'Revolut PLN', currency: 'PLN', description: 'IBAN LT54 3250 0732 0994 5743.' },
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
                { uid: 'w1', identifier: 'BE75967288224651', currency: 'EUR' },
                { uid: 'w2', identifier: '203412614', currency: 'EUR' },
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
});
