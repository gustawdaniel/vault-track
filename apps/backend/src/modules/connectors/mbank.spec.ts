import { describe, expect, it } from 'vitest';
import { parseMbankCsv } from './mbank';

const SAMPLE = `\uFEFFmBank S.A. Bankowość Detaliczna;
\t\tSkrytka Pocztowa 2108;

#Klient;
PRZYKŁADOWA FIRMA SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ;

Lista operacji;

#Data operacji;#Opis operacji;#Rachunek;#Kategoria;#Kwota;#Saldo po operacji;
2026-10-10;"OPŁATA ZA PROWADZENIE RACHUNKU";"mBiznes konto Standard 1234 ... 5678";"Bez kategorii";-19,00 PLN;418,27 PLN;
2026-09-01;"Revolut Bank UAB  Konstitucijos 21B  Vilnius";"mBiznes konto Standard 1234 ... 5678";"Wpływy - inne";300,00 PLN;1 466,27 PLN;
`;

describe('mBank CSV parser', () => {
    it('finds the operation table after the preamble and parses semicolon rows', () => {
        const result = parseMbankCsv(SAMPLE);

        expect(result.skipped).toBe(0);
        expect(result.transactions).toHaveLength(2);

        expect(result.transactions[0]).toMatchObject({
            date: '2026-10-10',
            amount: -19,
            balance: 418.27,
            payee: 'OPŁATA ZA PROWADZENIE RACHUNKU',
            category: 'Bez kategorii',
            currency: 'PLN',
            clearedStatus: 'X',
        });

        expect(result.transactions[1]).toMatchObject({
            date: '2026-09-01',
            amount: 300,
            balance: 1466.27,
            payee: 'Revolut Bank UAB',
            category: 'Wpływy - inne',
        });
    });

    it('rejects a file without the operation header', () => {
        expect(() => parseMbankCsv('a;b;c\n1;2;3\n')).toThrow(
            /missing "#Data operacji" header/,
        );
    });
});
