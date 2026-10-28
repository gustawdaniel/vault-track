import { describe, expect, it } from 'vitest';
import { dayInZone, isoInZone, knowsExecutionBetter, ledgerDay, startOfDay, withDates } from './dates';

describe('transaction dates', () => {
    it('writes instants with the zone offset, summer and winter', () => {
        expect(isoInZone(Date.parse('2026-10-23T09:43:18Z'))).toBe('2026-10-23T11:43:18+02:00');
        expect(isoInZone(Date.parse('2026-12-01T23:30:00Z'))).toBe('2026-12-02T00:30:00+01:00');
        expect(dayInZone('2026-12-01T23:30:00Z')).toBe('2026-12-02');
        expect(startOfDay('2026-10-23')).toBe('2026-10-23T00:00:00+02:00');
        expect(startOfDay('2026-01-05')).toBe('2026-01-05T00:00:00+01:00');
    });

    it('a transaction from before the model is booked and known to the day', () => {
        expect(withDates({ date: '2026-08-02' })).toEqual({
            date: '2026-08-02',
            executedAt: '2026-08-02T00:00:00+02:00',
            executedAtPrecision: 'day',
            executedAtSource: 'import',
            bookingDate: '2026-08-02',
        });
    });

    it('the date follows the moment of execution in the account zone', () => {
        const tx = withDates({ executedAt: '2026-10-31T23:30:00+01:00', executedAtPrecision: 'second', executedAtSource: 'bank-web', bookingDate: '2026-11-02' });
        expect(tx.date).toBe('2026-10-31');
        expect(ledgerDay(tx)).toBe('2026-11-02');
    });

    it('a payment the bank has not booked counts on the day it was made', () => {
        const tx = withDates({ executedAt: '2026-10-27T21:05:00+01:00', executedAtPrecision: 'minute', executedAtSource: 'email', bookingDate: null });
        expect(tx.bookingDate).toBeNull();
        expect(ledgerDay(tx)).toBe('2026-10-27');
    });

    it('a more precise or more trusted source corrects the moment, never the other way', () => {
        const api = { executedAt: '2026-10-23T00:00:00+02:00', executedAtPrecision: 'day' as const, executedAtSource: 'bank-api' as const };
        const web = { executedAt: '2026-10-23T11:43:18+02:00', executedAtPrecision: 'second' as const, executedAtSource: 'bank-web' as const };
        const mail = { executedAt: '2026-10-23T11:43:00+02:00', executedAtPrecision: 'minute' as const, executedAtSource: 'email' as const };
        expect(knowsExecutionBetter(web, api)).toBe(true);
        expect(knowsExecutionBetter(api, web)).toBe(false);
        expect(knowsExecutionBetter(mail, web)).toBe(false);
        expect(knowsExecutionBetter(mail, api)).toBe(true);
    });
});
