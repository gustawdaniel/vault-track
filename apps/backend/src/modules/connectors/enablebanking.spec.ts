import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
    createEnableBankingJwt,
    mapEnableBankingTransaction,
    pickBalance,
    sourceSlug,
} from './enablebanking';

function generateKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
}

describe('Enable Banking adapter', () => {
    it('creates a valid RS256 JWT with the application id as kid', () => {
        const { publicKey, privateKey } = generateKeyPair();
        const appId = 'bdd4e33f-494a-469b-ac5c-5f269c4f4410';
        const token = createEnableBankingJwt(appId, privateKey);

        const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
        expect(encodedHeader).toBeTruthy();
        expect(encodedPayload).toBeTruthy();
        expect(encodedSignature).toBeTruthy();

        const header = JSON.parse(Buffer.from(encodedHeader!, 'base64url').toString('utf-8'));
        const payload = JSON.parse(Buffer.from(encodedPayload!, 'base64url').toString('utf-8'));

        expect(header).toMatchObject({ alg: 'RS256', typ: 'JWT', kid: appId });
        expect(payload).toMatchObject({
            iss: 'enablebanking.com',
            aud: 'api.enablebanking.com',
        });
        expect(payload.exp).toBeGreaterThan(payload.iat);

        const valid = crypto.verify(
            'RSA-SHA256',
            Buffer.from(`${encodedHeader}.${encodedPayload}`),
            publicKey,
            Buffer.from(encodedSignature!, 'base64url'),
        );
        expect(valid).toBe(true);
    });

    it('maps debit and credit transactions with the right sign and status', () => {
        const debit = mapEnableBankingTransaction({
            transaction_id: 'tx-1',
            booking_date: '2026-10-17',
            transaction_amount: { amount: '12.34', currency: 'PLN' },
            credit_debit_indicator: 'DBIT',
            status: 'BOOK',
            creditor: { name: 'Żabka' },
            remittance_information_unstructured: 'Zakupy',
            balance_after_transaction: { amount: '100.00', currency: 'PLN' },
        });

        expect(debit).toMatchObject({
            externalId: 'tx-1',
            date: '2026-10-17',
            amount: -12.34,
            payee: 'Żabka',
            memo: 'Zakupy',
            currency: 'PLN',
            balance: 100,
            clearedStatus: 'X',
        });

        const credit = mapEnableBankingTransaction({
            entry_reference: 'ref-2',
            value_date: '2026-10-18',
            transaction_amount: { amount: 1250, currency: 'PLN' },
            credit_debit_indicator: 'CRDT',
            status: 'PDNG',
            debtor: { name: 'Klient' },
            remittance_information: ['Faktura', '10/2026'],
        });

        expect(credit).toMatchObject({
            externalId: 'ref-2',
            amount: 1250,
            payee: 'Klient',
            memo: 'Faktura 10/2026',
            clearedStatus: '?',
        });
    });

    it('prefers interim available balance and builds a stable source slug', () => {
        const balance = pickBalance([
            { balance_type: 'closingBooked', balance_amount: { amount: '10.00', currency: 'PLN' }, reference_date: '2026-10-17' },
            { balance_type: 'interimAvailable', balance_amount: { amount: '20.50', currency: 'PLN' }, reference_date: '2026-10-18' },
        ]);

        expect(balance).toEqual({
            value: 10,
            date: '2026-10-17',
            currency: 'PLN',
            type: 'closingBooked',
        });

        // Millennium returns Berlin Group codes; booked must win over available.
        expect(pickBalance([
            { balance_type: 'ITAV', balance_amount: { amount: '1966.63', currency: 'PLN' } },
            { balance_type: 'ITBD', balance_amount: { amount: '-6033.37', currency: 'PLN' }, reference_date: '2026-10-18' },
        ])).toEqual({
            value: -6033.37,
            date: '2026-10-18',
            currency: 'PLN',
            type: 'ITBD',
        });

        expect(sourceSlug('Bank Millennium')).toBe('enablebanking:bank-millennium');
    });

    it('keeps the day it was made apart from the booking day; pending has no booking day', async () => {
        const { mapEnableBankingTransaction } = await import('./enablebanking');
        const booked = mapEnableBankingTransaction({
            status: 'BOOK', booking_date: '2026-10-29', value_date: '2026-10-29', transaction_date: '2026-10-27',
            transaction_amount: { amount: '20.00', currency: 'PLN' }, credit_debit_indicator: 'DBIT', entry_reference: 'x',
        });
        expect(booked).toMatchObject({ date: '2026-10-27', bookingDate: '2026-10-29', executedAtPrecision: 'day', executedAtSource: 'bank-api' });
        const pending = mapEnableBankingTransaction({
            status: 'PDNG', value_date: '2026-10-28',
            transaction_amount: { amount: '5.00', currency: 'PLN' }, credit_debit_indicator: 'DBIT', entry_reference: 'y',
        });
        expect(pending).toMatchObject({ date: '2026-10-28', bookingDate: null });
    });

    it('Revolut: booking_date is the day it was made, value_date the day it was booked', async () => {
        const { mapEnableBankingTransaction } = await import('./enablebanking');
        const card = mapEnableBankingTransaction({
            status: 'BOOK', booking_date: '2026-10-20', value_date: '2026-10-21',
            transaction_amount: { amount: '34.90', currency: 'PLN' }, credit_debit_indicator: 'DBIT', entry_reference: 'x',
        }, 'Revolut');
        expect(card).toMatchObject({ date: '2026-10-20', bookingDate: '2026-10-21' });
    });
});
