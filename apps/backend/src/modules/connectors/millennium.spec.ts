import { describe, expect, it } from 'vitest';
import { parseCsv, parseMillenniumCsv } from './millennium';

const SAMPLE = `\uFEFF"Numer rachunku/karty","Data transakcji","Data rozliczenia","Rodzaj transakcji","Na konto/Z konta","Odbiorca/Zleceniodawca","Opis","Obciążenia","Uznania","Saldo","Waluta"
"PL00 1160 0000 0000 0000 0000 0001","2023-10-21","2023-10-21","OPŁATA","00 11 6022 0000 0000 0000 0000 02","Bank Millennium SA","OPŁ. MIES. KARTA VISA 360 4000XXXXXXXX0000 ZA 09/2023","-7.00","","24072.08","PLN"
"PL00 1160 0000 0000 0000 0000 0001","2023-10-12","2023-10-12","PRZELEW PRZYCHODZĄCY","00 10 9000 0000 0000 0000 0000 03","PRZYKŁADOWY KONTRAHENT ANNA NOWA\u00a0K","Przelew","","1250.00","24079.08","PLN"
"PL00 1160 0000 0000 0000 0000 0001","24.10.2023","2023-10-26","ZAKUP","","GITLAB INC.","Hello, world","-51.62","","1448.38","PLN"
"PL00 1160 0000 0000 0000 0000 0001","2023-10-25","2023-10-25","INFO","","","","","","1448.38","PLN"
"PL00 1160 0000 0000 0000 0000 0001","not-a-date","not-a-date","BROKEN","","","","-1.00","","1447.38","PLN"
`;

describe('Millennium CSV parser', () => {
    it('parses quoted CSV fields with commas and escaped quotes', () => {
        const rows = parseCsv('a,b\n"x, y","he said ""hi"""\n');
        expect(rows).toEqual([
            ['a', 'b'],
            ['x, y', 'he said "hi"'],
        ]);
    });

    it('maps debit/credit columns to signed amounts', () => {
        const result = parseMillenniumCsv(SAMPLE);

        expect(result.iban).toBe('PL00 1160 0000 0000 0000 0000 0001');
        expect(result.currency).toBe('PLN');
        expect(result.skipped).toBe(2);
        expect(result.transactions).toHaveLength(3);

        expect(result.transactions[0]).toMatchObject({
            date: '2023-10-21',
            amount: -7,
            payee: 'Bank Millennium SA',
            balance: 24072.08,
        });
        expect(result.transactions[1]).toMatchObject({
            date: '2023-10-12',
            amount: 1250,
            payee: 'PRZYKŁADOWY KONTRAHENT ANNA NOWA K',
        });
        expect(result.transactions[2]).toMatchObject({
            date: '2023-10-26',
            amount: -51.62,
            memo: 'Hello, world',
            balance: 1448.38,
            raw: { transactionDate: '2023-10-24', settlementDate: '2023-10-26' },
        });
    });

    it('rejects files without the Millennium header', () => {
        expect(() => parseMillenniumCsv('date,amount\n2023-10-21,-7\n')).toThrow(
            /missing "Numer rachunku\/karty" header/,
        );
    });
});
