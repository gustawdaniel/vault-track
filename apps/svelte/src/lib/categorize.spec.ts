import { describe, expect, it } from 'vitest';
import { createCategorizer, isMeaningfulCategory, payeeKey } from './categorize';

const categories = [
    { category: 'Transport:Train' },
    { category: 'Transport' },
    { category: 'Food:Eating out' },
    { category: 'Fun:Sport', keywords: ['grawitacja'] },
];

describe('payeeKey', () => {
    it('drops numbers, ids and the www prefix', () => {
        expect(payeeKey('www.koleo.pl Francuska 11a Warszawa')).toBe('koleo.pl francuska warszawa');
        expect(payeeKey('BAR KIM LOAN     74940')).toBe('bar kim loan');
        expect(payeeKey('https://alab.pl')).toBe('alab.pl');
        expect(payeeKey('Top-Up by *3337')).toBe('top-up by *3337');
    });
});

describe('isMeaningfulCategory', () => {
    it('rejects empty, uncategorized and transfers', () => {
        expect(isMeaningfulCategory('')).toBe(false);
        expect(isMeaningfulCategory('Other:Uncategorized')).toBe(false);
        expect(isMeaningfulCategory('[mBank Prywatne]')).toBe(false);
        expect(isMeaningfulCategory('Transfer')).toBe(false);
        expect(isMeaningfulCategory('Transfer:Atm')).toBe(false);
        expect(isMeaningfulCategory('Food:Groceries')).toBe(true);
    });
});

describe('createCategorizer', () => {
    const suggest = createCategorizer(categories, [
        { payee: 'Bar Kim Loan 74940', category: 'Food:Eating out', amount: -27 },
        { payee: 'Bar Kim Loan 74940', category: 'Food:Eating out', amount: -27 },
        { payee: 'Jan Kowalski', category: 'Fun:Sport', amount: -10 },
        { payee: 'Jan Kowalski', category: 'Food:Groceries', amount: -10 },
    ]);

    it('uses the keywords written on a category first', () => {
        expect(suggest({ payee: 'https://www.stacjagrawitacja.pl/war' })).toMatchObject({ category: 'Fun:Sport', reason: 'keyword' });
    });

    it('knows obvious merchants, also from the memo', () => {
        expect(suggest({ payee: 'koleo.pl' })).toMatchObject({ category: 'Transport:Train', reason: 'default' });
        expect(suggest({ payee: 'JAN KOWALSKI', memo: 'KOLEO bilety kolejowe Warszawa' })?.category).toBe('Transport:Train');
        expect(suggest({ payee: 'jakdojade.pl' })?.category).toBe('Transport');
    });

    it('repeats the category of the same payee', () => {
        expect(suggest({ payee: 'BAR KIM LOAN     74941' })).toMatchObject({ category: 'Food:Eating out', reason: 'history' });
    });

    it('prefers how the user categorized the payee over built-in keywords', () => {
        const own = createCategorizer(categories.concat([{ category: 'Transport:Bus' }]), [
            { payee: 'jakdojade.pl', category: 'Transport:Bus', amount: -25 },
        ]);
        expect(own({ payee: 'jakdojade.pl' })).toMatchObject({ category: 'Transport:Bus', reason: 'history' });
    });

    it('reads income and expenses of a payee separately, whatever the diacritics', () => {
        const sowa = createCategorizer(categories.concat([{ category: 'Income:Business revenue' }, { category: 'Transfer' }]), [
            { payee: 'SZKOŁA UMYSŁU SOWA MAŁGORZATA PASZEK', category: 'Income:Business revenue', amount: 250 },
            { payee: 'SZKOLA UMYSLU SOWA MALGORZATA PASZEK', category: 'Income:Business revenue', amount: 250 },
            { payee: 'SZKOŁA UMYSŁU SOWA MAŁGORZATA PASZE', category: 'Transfer', amount: -500 },
        ]);
        expect(sowa({ payee: 'SZKOŁA UMYSŁU SOWA MAŁGORZATA PASZE', amount: 250 })).toMatchObject({ category: 'Income:Business revenue' });
        // a refund to the client was marked "Transfer": transfers are between own accounts, never suggested
        expect(sowa({ payee: 'SZKOŁA UMYSŁU SOWA MAŁGORZATA PASZE', amount: -500 })).toBeNull();
    });

    it('stays silent when the payee history is mixed', () => {
        expect(suggest({ payee: 'JAN KOWALSKI', memo: 'Revolut**1234* Dublin' })).toBeNull();
    });

    it('skips built-in keywords for categories the group does not have', () => {
        expect(suggest({ payee: 'Biedronka 123' })).toBeNull();
    });

    it('falls back to the merchant category code written in the memo', () => {
        const mcc = createCategorizer([{ category: 'Food:Eating out' }, { category: 'Health' }], []);
        expect(mcc({ payee: 'Vincent Boulangerie', memo: 'Revolut CARD_PAYMENT · MCC 5462 · 09:07', amount: -26.8 }))
            .toMatchObject({ category: 'Food:Eating out', reason: 'mcc' });
        expect(mcc({ payee: 'Centrum Medyczne Roy', memo: 'MCC 8099', amount: -250 })?.category).toBe('Health');
    });

    it('suggests a move to my own account only when the payee clearly always means it', () => {
        const topups = [
            ...Array.from({ length: 5 }, () => ({ payee: 'Top-up by *3337', category: '[Millennium Bank]', amount: 500 })),
            ...Array.from({ length: 3 }, () => ({ payee: 'Top-up by *6639', category: 'Housing:Utilities', amount: 500 })),
        ];
        const own = createCategorizer([], topups);
        expect(own({ payee: 'Top-Up by *3337', amount: 50 })).toMatchObject({ category: '[Millennium Bank]', reason: 'history' });
        const once = createCategorizer([], topups.slice(0, 2));
        expect(once({ payee: 'Top-Up by *3337', amount: 50 })).toBeNull();
    });
});
