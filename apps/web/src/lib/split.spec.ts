import { describe, expect, it } from 'vitest';
import {
  buildSplitEvents,
  decodeSplitId,
  encodeSplitId,
  isSplitValid,
  splitRemaining,
  type SplitLine,
} from './split';
import type { Account, Transaction } from './types';

const account: Account = { id: 'acc1', name: 'Konto', type: 'Bank', currency: 'PLN' };
const round = (n: number) => Math.round(n * 100) / 100;
const line = (id: string, amount: number, extra: Partial<SplitLine> = {}): SplitLine => ({
  id,
  amount,
  payee: '',
  category: '',
  memo: '',
  ...extra,
});

describe('split ids', () => {
  it('round-trips the Vue "payee###uuid" format', () => {
    const encoded = encodeSplitId('Biedronka', 'abc');
    expect(encoded).toBe('Biedronka###abc');
    expect(decodeSplitId(encoded)).toEqual({ id: 'abc', payee: 'Biedronka' });
    expect(decodeSplitId('plain')).toEqual({ id: 'plain', payee: undefined });
  });
});

describe('split validation', () => {
  it('requires lines to add up to the total', () => {
    expect(splitRemaining(10, [line('a', 3.3), line('b', 6.7)])).toBe(0);
    expect(isSplitValid(10, [line('a', 3.3), line('b', 6.7)])).toBe(true);
    expect(isSplitValid(10, [line('a', 3)])).toBe(false);
    expect(isSplitValid(0, [])).toBe(false);
    expect(isSplitValid(5, [line('a', 5), line('b', 0)])).toBe(false);
  });
});

describe('buildSplitEvents', () => {
  it('creates expense members sharing one split id', () => {
    const events = buildSplitEvents({
      transactions: {},
      account,
      lines: [line('a', 4.5, { payee: 'Mleko', category: 'Jedzenie' }), line('b', 2)],
      groupPayee: 'Lidl',
      project: 'Dom',
      memo: '',
      date: '2026-10-23',
      round,
    });
    expect(events.map((e) => e.type)).toEqual(['TRANSACTION_ADDED', 'TRANSACTION_ADDED']);
    const [a, b] = events.map((e) => e.payload as Transaction);
    expect(a.amount).toBe(-4.5);
    expect(a.category).toBe('Jedzenie/Dom');
    expect(a.payee).toBe('Mleko');
    expect(b.payee).toBe('Lidl');
    expect(a.splitId).toBe(b.splitId);
    expect(decodeSplitId(a.splitId).payee).toBe('Lidl');
  });

  it('updates kept members, keeps their extra fields and deletes removed ones', () => {
    const existing: Record<string, Transaction> = {
      a: { id: 'a', account: 'Konto', accountId: 'acc1', amount: -5, date: '2026-10-01', splitId: 'Lidl###u1', externalId: 'bank-1' },
      b: { id: 'b', account: 'Konto', accountId: 'acc1', amount: -5, date: '2026-10-01', splitId: 'Lidl###u1' },
    };
    const events = buildSplitEvents({
      transactions: existing,
      account,
      lines: [line('a', 10)],
      groupPayee: 'Lidl',
      project: '',
      memo: '',
      date: '2026-10-01',
      existingSplitId: 'Lidl###u1',
      previousIds: ['a', 'b'],
      round,
    });
    expect(events).toHaveLength(2);
    expect(events[0]!.type).toBe('TRANSACTION_UPDATED');
    expect(events[0]!.payload.externalId).toBe('bank-1');
    expect(events[0]!.payload.splitId).toBe('Lidl###u1');
    expect(events[1]).toEqual({ type: 'TRANSACTION_DELETED', payload: { id: 'b' } });
  });
});
