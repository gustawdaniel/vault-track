/**
 * Dates of a transaction (decision of 28.10.2026):
 *
 *  - executedAt          required  when it was really paid / ordered, ISO with the offset ("2026-10-23T11:43:18+02:00")
 *  - executedAtPrecision required  second | minute | day (a day from a bank statement is not 00:00 on the clock)
 *  - executedAtSource    required  who knows it: a better source may correct it, a worse one never does
 *  - bookingDate         optional  the day the bank booked it; null while the bank has not booked it yet
 *  - date                required  derived: the day of executedAt in the account's time zone (kept for QIF, views, SQL)
 *
 * The ledger (balances, asserts) counts a transaction on its bookingDate, or on its date while it is not booked,
 * so an assert is the real state of the account at the end of the bank's day, pending payments included.
 *
 * Events written before this model carry only `date`: they are booked transactions known to the day.
 * The web app has a copy of this module (apps/svelte/src/lib/dates.ts); keep the two in step.
 */

export type ExecutedAtPrecision = 'second' | 'minute' | 'day';
export type ExecutedAtSource = 'bank-web' | 'email' | 'receipt' | 'manual' | 'bank-api' | 'import';

export const DEFAULT_TIMEZONE = 'Europe/Warsaw';

const PRECISION_RANK: Record<ExecutedAtPrecision, number> = { day: 0, minute: 1, second: 2 };
// a receipt or ticket prints the moment of sale; typed by hand it is a guess
const SOURCE_RANK: Record<ExecutedAtSource, number> = { import: 0, 'bank-api': 1, manual: 2, receipt: 3, email: 4, 'bank-web': 5 };

export interface TransactionDates {
    date?: string;
    executedAt?: string;
    executedAtPrecision?: ExecutedAtPrecision;
    executedAtSource?: ExecutedAtSource;
    bookingDate?: string | null;
}

function parts(ms: number, timeZone: string) {
    const values = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
        })
            .formatToParts(new Date(ms))
            .map((p) => [p.type, p.value]),
    );
    return values as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', string>;
}

function offsetMinutes(ms: number, timeZone: string): number {
    const p = parts(ms, timeZone);
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

function formatOffset(minutes: number): string {
    const sign = minutes < 0 ? '-' : '+';
    const abs = Math.abs(minutes);
    return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/** An instant written in the given zone: "2026-10-23T11:43:18+02:00". */
export function isoInZone(ms: number, timeZone = DEFAULT_TIMEZONE): string {
    const p = parts(ms, timeZone);
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${formatOffset(offsetMinutes(ms, timeZone))}`;
}

/** A wall-clock time of the given zone ("2026-10-31T11:47") as an instant with its offset. */
export function zonedIso(local: string, timeZone = DEFAULT_TIMEZONE): string {
    const guess = Date.parse(`${local.length === 16 ? `${local}:00` : local.slice(0, 19)}Z`);
    let ms = guess - offsetMinutes(guess, timeZone) * 60000;
    ms = guess - offsetMinutes(ms, timeZone) * 60000;
    return isoInZone(ms, timeZone);
}

/** The calendar day of an instant in the given zone. */
export function dayInZone(iso: string | number, timeZone = DEFAULT_TIMEZONE): string {
    const ms = typeof iso === 'number' ? iso : Date.parse(iso);
    const p = parts(ms, timeZone);
    return `${p.year}-${p.month}-${p.day}`;
}

/** Midnight of a day in the given zone, as an instant with its offset. */
export function startOfDay(day: string, timeZone = DEFAULT_TIMEZONE): string {
    const guess = Date.parse(`${day}T00:00:00Z`);
    const ms = guess - offsetMinutes(guess, timeZone) * 60000;
    return isoInZone(ms, timeZone);
}

/** Fills the date fields of a transaction (see the module comment); the input is not changed. */
export function withDates<T extends TransactionDates>(tx: T, timeZone = DEFAULT_TIMEZONE): T & Required<Omit<TransactionDates, 'bookingDate'>> & { bookingDate: string | null } {
    const day = (tx.date || '').slice(0, 10);
    if (tx.executedAt) {
        const precision = tx.executedAtPrecision ?? 'second';
        const date = precision === 'day' && day ? day : dayInZone(tx.executedAt, timeZone);
        return {
            ...tx,
            date,
            executedAt: tx.executedAt,
            executedAtPrecision: precision,
            executedAtSource: tx.executedAtSource ?? 'import',
            bookingDate: tx.bookingDate === undefined ? date : tx.bookingDate,
        };
    }
    return {
        ...tx,
        date: day,
        executedAt: startOfDay(day, timeZone),
        executedAtPrecision: 'day',
        executedAtSource: tx.executedAtSource ?? 'import',
        bookingDate: tx.bookingDate === undefined ? day : tx.bookingDate,
    };
}

/** The day the ledger counts a transaction on: booked → bookingDate, not booked yet → the day it was made. */
export function ledgerDay(tx: TransactionDates): string {
    return (tx.bookingDate || tx.date || '').slice(0, 10);
}

/** Whether `incoming` knows the moment of execution better than `current` (more precise, then more trusted). */
export function knowsExecutionBetter(incoming: TransactionDates, current: TransactionDates): boolean {
    if (!incoming.executedAt) return false;
    if (!current.executedAt) return true;
    const p = PRECISION_RANK[incoming.executedAtPrecision ?? 'day'] - PRECISION_RANK[current.executedAtPrecision ?? 'day'];
    if (p !== 0) return p > 0;
    return SOURCE_RANK[incoming.executedAtSource ?? 'import'] > SOURCE_RANK[current.executedAtSource ?? 'import'];
}
