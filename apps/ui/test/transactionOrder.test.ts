import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTransactionStore } from '~/store/transaction';
import type { FullTransaction } from '~/store/transaction.model';

const syncUpdateMock = vi.fn();

vi.mock('~/sync/manager', () => ({
    createTransaction: vi.fn(),
    createTransactionBatch: vi.fn(),
    updateTransaction: (tx: any) => syncUpdateMock(tx),
    deleteTransactionBatch: vi.fn(),
}));

vi.mock('~/store/account', () => ({
    useAccountStore: () => ({
        getFirstAccountIdToTransferFromName: () => 'acc-1',
        getById: () => ({ id: 'acc-1', name: 'Account 1', currency: 'USD' }),
        pathBalance: vi.fn(),
    }),
}));

const mockTxs: FullTransaction[] = [
    { id: '1', accountId: 'acc-1', account: 'Account 1', amount: 10, date: '2023-01-01T00:00:00', hash: 'h1' },
    { id: '2', accountId: 'acc-1', account: 'Account 1', amount: 20, date: '2023-01-01T00:00:00', hash: 'h2' },
    { id: '3', accountId: 'acc-1', account: 'Account 1', amount: 30, date: '2023-01-01T00:00:00', hash: 'h3' },
    { id: '4', accountId: 'acc-1', account: 'Account 1', amount: 40, date: '2023-01-02T00:00:00', hash: 'h4' },
];

describe('transaction.ts changeTransactionOrder', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        syncUpdateMock.mockClear();
    });

    it('assigns explicit sequential orders and swaps correctly for "up"', async () => {
        const store = useTransactionStore();
        store.$state.transactions = [...mockTxs];

        // Txs 1, 2, 3 are on the same date. Array order is 1, 2, 3.
        // Moving '2' (index 1) 'up' should swap it with index + 1, which is '3' (index 2).
        await store.changeTransactionOrder('2', 'up');

        const tx1 = store.getById('1')!;
        const tx2 = store.getById('2')!;
        const tx3 = store.getById('3')!;

        // Assigned orders should be:
        // tx1 wasn't swapped, remains 0
        // tx2 original 1, swapped with tx3 (2), so it gets 2
        // tx3 original 2, swapped to 1
        expect(tx1.order).toBe(0);
        expect(tx2.order).toBe(2);
        expect(tx3.order).toBe(1);

        expect(syncUpdateMock).toHaveBeenCalled();
    });

    it('swaps correctly for "down" with existing orders', async () => {
        const store = useTransactionStore();
        store.$state.transactions = [
            { ...mockTxs[0]!, order: 0 },
            { ...mockTxs[1]!, order: 1 },
            { ...mockTxs[2]!, order: 2 },
        ];

        // Move '2' 'down' (index - 1) -> swaps with '1'
        await store.changeTransactionOrder('2', 'down');

        const tx1 = store.getById('1')!;
        const tx2 = store.getById('2')!;
        const tx3 = store.getById('3')!;

        expect(tx1.order).toBe(1);
        expect(tx2.order).toBe(0);
        expect(tx3.order).toBe(2);

        // Sync should only be called for 1 and 2 since they changed orders
        expect(syncUpdateMock).toHaveBeenCalledTimes(2);
    });

    it('keeps both halves of a transfer together and skips correctly', async () => {
        const store = useTransactionStore();

        // Tx1 (normal), Tx2 & Tx3 (transfer), Tx4 (normal)
        store.$state.transactions = [
            { id: '1', accountId: 'acc-1', account: 'Account 1', amount: 10, date: '2023-01-01', hash: 'h1' } as any,
            { id: '2', accountId: 'acc-1', account: 'Account 1', amount: -50, date: '2023-01-01', hash: 'h2', transferHash: 'xyz' } as any,
            { id: '3', accountId: 'acc-2', account: 'Account 2', amount: 50, date: '2023-01-01', hash: 'h3', transferHash: 'xyz' } as any,
            { id: '4', accountId: 'acc-3', account: 'Account 3', amount: 30, date: '2023-01-01', hash: 'h4' } as any,
        ];

        // Array is implicitly sorted by id: 1, 2, 3, 4. Giving orders 0, 1, 1, 2.
        // Move transfer (Tx2) "up" (index + 1). 
        // It should skip Tx3 (same transfer) and swap with Tx4.
        await store.changeTransactionOrder('2', 'up');

        const tx1 = store.getById('1')!;
        const tx2 = store.getById('2')!;
        const tx3 = store.getById('3')!;
        const tx4 = store.getById('4')!;

        expect(tx1.order).toBe(0);
        // Both halves of the transfer must have the exact same assigned order!
        // Tx4's order was 2, so Tx2 and Tx3 get 2.
        expect(tx2.order).toBe(2);
        expect(tx3.order).toBe(2);
        // Tx4 gets the transfer's old order of 1.
        expect(tx4.order).toBe(1);

        // Swap back - cohesive "down" (index - 1). Should skip Tx3, swap with Tx4 (which is now at order 1, so index 1 in the sorted list).
        await store.changeTransactionOrder('2', 'down');

        expect(store.getById('1')!.order).toBe(0);
        expect(store.getById('2')!.order).toBe(1);
        expect(store.getById('3')!.order).toBe(1);
        expect(store.getById('4')!.order).toBe(2);
    });

    it('keeps splits together and skips correctly', async () => {
        const store = useTransactionStore();

        // Tx1 (normal), Tx2 & Tx3 (split), Tx4 (normal)
        store.$state.transactions = [
            { id: '1', accountId: 'acc-1', account: 'Account 1', amount: 10, date: '2023-01-01' } as any,
            { id: '2', accountId: 'acc-1', account: 'Account 1', amount: -20, date: '2023-01-01', splitId: 'splitxyz' } as any,
            { id: '3', accountId: 'acc-1', account: 'Account 1', amount: -30, date: '2023-01-01', splitId: 'splitxyz' } as any,
            { id: '4', accountId: 'acc-1', account: 'Account 1', amount: 30, date: '2023-01-01' } as any,
        ];

        // Move split portion (Tx2) "up" (index + 1). 
        // It should skip Tx3 (same split) and swap with Tx4.
        await store.changeTransactionOrder('2', 'up');

        expect(store.getById('1')!.order).toBe(0);
        expect(store.getById('2')!.order).toBe(2);
        expect(store.getById('3')!.order).toBe(2);
        expect(store.getById('4')!.order).toBe(1);

        // Swap back - cohesive "down" (index - 1). Should skip Tx3, swap with Tx4 (which is now at order 1, so index 1 in the sorted list).
        await store.changeTransactionOrder('2', 'down');

        expect(store.getById('1')!.order).toBe(0);
        expect(store.getById('2')!.order).toBe(1);
        expect(store.getById('3')!.order).toBe(1);
        expect(store.getById('4')!.order).toBe(2);
    });
});
