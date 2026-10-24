import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTransactionStore } from '../store/transaction';
import { useAccountStore } from '../store/account';
import { Trx } from '../store/transaction.model';

vi.mock('../sync/manager', () => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  updateTransactionBatch: vi.fn(),
}));

describe('changeTransactionOrder with gaps and transfers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should swap normal and transfer exactly with one click even if order has gaps', async () => {
    const tStore = useTransactionStore();

    // Normal transaction in Account 1, order 0
    tStore.$state.transactions.push(new Trx({
      id: 'normal-1',
      account: 'Acc 1',
      accountId: 'acc1',
      date: '2023-01-01',
      amount: -10,
      order: 0,
    }).json);

    const hash = 'hash-123';
    // Transfer leg inside Account 1, order 5
    tStore.$state.transactions.push(new Trx({
      id: 'transfer-leg1',
      account: 'Acc 1',
      accountId: 'acc1',
      date: '2023-01-01',
      amount: -50,
      order: 5,
      transferHash: hash,
    }).json);

    // Transfer leg inside Account 2, order 5
    tStore.$state.transactions.push(new Trx({
      id: 'transfer-leg2',
      account: 'Acc 2',
      accountId: 'acc2',
      date: '2023-01-01',
      amount: 50,
      order: 5,
      transferHash: hash,
    }).json);

    // Initial state:
    // normal-1: 0
    // transfer-leg1: 5
    // transfer-leg2: 5

    // Click UP on normal-1 within the context of Account 1
    await tStore.changeTransactionOrder('normal-1', 'up', 'acc1');

    const normalAfter = tStore.getById('normal-1');
    const t1After = tStore.getById('transfer-leg1');
    const t2After = tStore.getById('transfer-leg2');


    // Expected:
    // transfer-leg1 and leg2 should move up (to order 0)
    // normal-1 should move down (to order 1)

    expect(normalAfter?.order).toBeGreaterThan(t1After?.order!);
    expect(t1After?.order).toBe(t2After?.order);
  });
});
