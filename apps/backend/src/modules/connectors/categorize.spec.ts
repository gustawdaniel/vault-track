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
    });
});

describe('isMeaningfulCategory', () => {
    it('rejects empty, uncategorized and transfers', () => {
        expect(isMeaningfulCategory('')).toBe(false);
        expect(isMeaningfulCategory('Other:Uncategorized')).toBe(false);
        expect(isMeaningfulCategory('[mBank Prywatne]')).toBe(false);
        expect(isMeaningfulCategory('Food:Groceries')).toBe(true);
    });
});

describe('createCategorizer', () => {
    const suggest = createCategorizer(categories, [
        { payee: 'Bar Kim Loan 74940', category: 'Food:Eating out' },
        { payee: 'Bar Kim Loan 74940', category: 'Food:Eating out' },
        { payee: 'Gustaw Daniel', category: 'Transfer' },
        { payee: 'Gustaw Daniel', category: 'Food:Groceries' },
    ]);

    it('uses the keywords written on a category first', () => {
        expect(suggest({ payee: 'https://www.stacjagrawitacja.pl/war' })).toMatchObject({ category: 'Fun:Sport', reason: 'keyword' });
    });

    it('knows obvious merchants, also from the memo', () => {
        expect(suggest({ payee: 'koleo.pl' })).toMatchObject({ category: 'Transport:Train', reason: 'default' });
        expect(suggest({ payee: 'GUSTAW DANIEL', memo: 'KOLEO bilety kolejowe Warszawa' })?.category).toBe('Transport:Train');
        expect(suggest({ payee: 'jakdojade.pl' })?.category).toBe('Transport');
    });

    it('repeats the category of the same payee', () => {
        expect(suggest({ payee: 'BAR KIM LOAN     74941' })).toMatchObject({ category: 'Food:Eating out', reason: 'history' });
    });

    it('prefers how the user categorized the payee over built-in keywords', () => {
        const own = createCategorizer(categories.concat([{ category: 'Transport:Bus' }]), [
            { payee: 'jakdojade.pl', category: 'Transport:Bus' },
        ]);
        expect(own({ payee: 'jakdojade.pl' })).toMatchObject({ category: 'Transport:Bus', reason: 'history' });
    });

    it('stays silent when the payee history is mixed', () => {
        expect(suggest({ payee: 'GUSTAW DANIEL', memo: 'Revolut**7953* Dublin' })).toBeNull();
    });

    it('skips built-in keywords for categories the group does not have', () => {
        expect(suggest({ payee: 'Biedronka 123' })).toBeNull();
    });
});
