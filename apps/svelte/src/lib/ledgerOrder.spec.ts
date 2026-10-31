import { describe, expect, it } from 'vitest';
import { buildLedgerTimeline, computeAccountsAndReconciliation } from './engine';
import { executedMs } from './dates';

const account: any = { id: 'a', name: 'Bank', type: 'Bank', currency: 'PLN', openingBalance: 0 };
const tx = (id: string, amount: number, executedAt?: string, precision: 'day' | 'minute' = 'minute'): any => ({
  id, accountId: 'a', account: 'Bank', date: '2026-10-31', amount, payee: id, category: 'Food',
  ...(executedAt ? { executedAt, executedAtPrecision: precision, executedAtSource: 'receipt' } : {}),
});

describe('ledger order within a day', () => {
  it('times compare by instant, not by the ISO text', () => {
    // 09:30 in UTC is later than 10:00 in Warsaw
    expect(executedMs({ executedAt: '2026-10-31T09:30:00Z', executedAtPrecision: 'minute' }) >
      executedMs({ executedAt: '2026-10-31T10:00:00+01:00', executedAtPrecision: 'minute' })).toBe(true);
    expect(executedMs({ executedAt: '2026-10-31T00:00:00+01:00', executedAtPrecision: 'day' })).toBe(0);
  });

  it('shows the latest payment of the day on top and counts the balance in the same order', () => {
    const txs = [
      tx('zz-late', -23, '2026-10-31T21:34:00+01:00'),
      tx('aa-noon', -61, '2026-10-31T11:47:00+01:00'),
      tx('mm-untimed', -200, '2026-10-31T00:00:00+01:00', 'day'),
      tx('bb-evening', -62, '2026-10-31T18:05:00+01:00'),
    ];
    const { runningBalanceByTxId, assertStatusById } = computeAccountsAndReconciliation([account], txs, []);
    const items = buildLedgerTimeline(txs, [], [account], [], { accountId: 'a', type: 'all' } as any, runningBalanceByTxId, assertStatusById);
    const ids = items.map((item: any) => item.tx.id);
    expect(ids).toEqual(['zz-late', 'bb-evening', 'aa-noon', 'mm-untimed']);
    // the newest row carries the balance after the whole day, each row below the balance before the row above
    expect(ids.map((id) => runningBalanceByTxId.get(id))).toEqual([-346, -323, -261, -200]);
  });
});
