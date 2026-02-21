import { type RemovableRef, useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import dayjs from 'dayjs';
import { useAccountStore } from '~/store/account';
import {
  createTransaction as syncCreateTransaction,
  createTransactionBatch as syncCreateTransactionBatch,
  updateTransaction as syncUpdateTransaction,
  updateTransactionBatch as syncUpdateTransactionBatch,
  deleteTransactionBatch as syncDeleteTransactionBatch,
} from '~/sync/manager';
import {
  Trx,
  type Transaction,
  type FullTransaction,
  type PersistedTransaction,
  type CreateTransactionOptions,
  isTransferByCategory,
} from '~/store/transaction.model';

// Re-export for compatibility
export * from '~/store/transaction.model';

interface State {
  transactions: RemovableRef<FullTransaction[]>;
}

export const useTransactionStore = defineStore('transaction', {
  state: (): State => ({
    transactions: useLocalStorage<FullTransaction[]>('transaction', [], { shallow: true }),
  }),
  actions: {
    async create(
      transaction: Transaction | PersistedTransaction,
      options?: CreateTransactionOptions,
    ) {
      const trx = new Trx(transaction);
      const index = this.$state.transactions.findIndex(
        (a) => a.hash === trx.hash,
      );
      if (index === -1 || Boolean(options?.allowDuplicates)) {
        if (options?.updateAccountBalance) {
          const accountStore = useAccountStore();
          accountStore.pathBalance(trx.data.accountId, trx.data.amount);
        }

        this.$state.transactions = [...this.$state.transactions, trx.json];
        await syncCreateTransaction(trx.json);
      } else {
        const newTransactions = [...this.$state.transactions];
        newTransactions[index] = trx.json;
        this.$state.transactions = newTransactions;

        await syncUpdateTransaction(trx.json);
      }
    },
    async createBatch(
      transactions: (Transaction | PersistedTransaction)[],
      options?: CreateTransactionOptions,
    ) {
      const trxList = transactions.map((t) => new Trx(t));
      const accountStore = useAccountStore();

      for (const trx of trxList) {
        if (options?.updateAccountBalance) {
          accountStore.pathBalance(trx.data.accountId, trx.data.amount);
        }
      }

      this.$state.transactions = [...this.$state.transactions, ...trxList.map(t => t.json)];

      // Sync all as a single batch with reserved counters
      await syncCreateTransactionBatch(trxList.map((t) => t.json));
    },
    async update(id: string, transaction: Partial<Transaction>, options?: { skipReverseCleanup?: boolean }) {
      const index = this.getIndexById(id);
      if (index !== -1) {
        const oldTrxData = this.$state.transactions[index];
        if (!oldTrxData) throw new Error('Transaction not found');
        const oldTrx = new Trx(oldTrxData);

        // Merge old data with new partial data
        const newTrxData: any = { ...oldTrx.data, ...transaction, id };
        // Force transferHash recomputation based on current data
        // to prevent stale hashes from keeping broken transfer links
        delete newTrxData.transferHash;

        const newTrx = new Trx(newTrxData);
        const accountStore = useAccountStore();

        if (
          oldTrx.data.accountId !== newTrx.data.accountId ||
          newTrx.data.amount !== oldTrx.data.amount
        ) {
          accountStore.pathBalance(oldTrx.data.accountId, -oldTrx.data.amount);
          accountStore.pathBalance(newTrx.data.accountId, newTrx.data.amount);
        }

        if (oldTrx.id !== newTrx.id)
          throw new Error(`Id can't be changed on update`);

        const newTransactions = [...this.$state.transactions];
        newTransactions[index] = newTrx.json;

        if (!options?.skipReverseCleanup && oldTrx.data.transferHash && oldTrx.data.transferHash !== newTrx.data.transferHash) {
          const reverseIndex = this.getReverseIndexByIdAndHash(
            id,
            oldTrx.data.transferHash,
          );
          if (reverseIndex !== -1) {
            const reverse = newTransactions[reverseIndex]; // Use newTransactions to look up? No, indices shift if we spliced? 
            // Wait, I am using direct index assignment above, so indices are stable.
            // But if I splice below, it changes.
            // If I use splice to remove reverse:
            if (reverse) {
              const accountStore = useAccountStore();
              accountStore.pathBalance(reverse.accountId, -reverse.amount);
              newTransactions.splice(reverseIndex, 1);
            }
          }
        }

        this.$state.transactions = newTransactions;
        await syncUpdateTransaction(newTrx.json);
      } else {
        // Fallback for creating if not found? 
        // Original code called create. If partial, create might fail if missing fields.
        // Assuming create needs full objects or defaults. 
        // If transaction is Partial, we can't really create a valid transaction easily without defaults.
        // But getNew() exists?
        // Let's keep original behavior but warn it might be incomplete if transaction is partial.
        await this.create(
          { ...transaction, id } as any,
          {
            allowDuplicates: true,
            updateAccountBalance: true,
          },
        );
      }
    },
    async delete(id: string): Promise<void> {
      const transaction = this.getById(id);
      const index = this.getIndexById(id);
      if (!transaction || index === -1) return;

      const accountStore = useAccountStore();

      // Collect all IDs to delete
      const idsToDelete: string[] = [id];
      accountStore.pathBalance(transaction.accountId, -transaction.amount);

      if (transaction.transferHash) {
        const reverse = this.getReverseByIdAndHash(
          id,
          transaction.transferHash,
        );
        if (reverse) {
          accountStore.pathBalance(reverse.accountId, -reverse.amount);
          idsToDelete.push(reverse.id);
        }
      }

      // Cascade delete for split transactions
      if (transaction.splitId) {
        const siblings = this.$state.transactions.filter(
          (t) => t.splitId === transaction.splitId && t.id !== id,
        );
        for (const sibling of siblings) {
          accountStore.pathBalance(sibling.accountId, -sibling.amount);
          idsToDelete.push(sibling.id);
        }
      }

      const idsToDeleteSet = new Set(idsToDelete);
      this.$state.transactions = this.$state.transactions.filter(t => !idsToDeleteSet.has(t.id));

      // Delete all related transactions atomically via batch
      await syncDeleteTransactionBatch(idsToDelete);
    },
    getNew(): FullTransaction {
      const accountStore = useAccountStore();
      const accountId = accountStore.getFirstAccountIdToTransferFromName('');
      const fullAccount = accountStore.getById(accountId);
      if (!fullAccount)
        throw new Error(`Cannot create transaction without account`);

      return new Trx({
        account: fullAccount.name,
        accountId,
        date: dayjs().format('YYYY-MM-DD'),
        amount: 0,
      }).json;
    },
    async changeTransactionOrder(id: string, direction: 'up' | 'down') {
      const transaction = this.getById(id);
      if (!transaction) return;

      const sameDateTransactions = this.$state.transactions.filter(
        (t) => t.date === transaction.date
      );

      sameDateTransactions.sort((a, b) => {
        const dateCompare = (a.date || '').localeCompare(b.date || '');
        if (dateCompare !== 0) return dateCompare;

        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        if (orderA !== orderB) return orderA - orderB;

        return a.id.localeCompare(b.id);
      });

      const newTransactions = [...this.$state.transactions];
      const updatesToSync: FullTransaction[] = [];

      // Ensure all sameDateTransactions have an explicit sequential order
      let nextOrder = 0;
      const transferOrderMap = new Map<string, number>();

      for (let i = 0; i < sameDateTransactions.length; i++) {
        const t = sameDateTransactions[i]!;
        let expectedOrder = nextOrder;

        if (t.transferHash) {
          if (transferOrderMap.has(t.transferHash)) {
            expectedOrder = transferOrderMap.get(t.transferHash)!;
          } else {
            transferOrderMap.set(t.transferHash, nextOrder);
            nextOrder++;
          }
        } else {
          nextOrder++;
        }

        if (t.order !== expectedOrder) {
          const storeIdx = this.getIndexById(t.id);
          if (storeIdx !== -1) {
            const updated = { ...newTransactions[storeIdx]!, order: expectedOrder };
            newTransactions[storeIdx] = updated;
            updatesToSync.push(updated);
            sameDateTransactions[i] = updated; // Update local array for accurate finding below
          }
        }
      }

      const index = sameDateTransactions.findIndex((t) => t.id === id);
      if (index === -1) return;

      const txFinal = sameDateTransactions[index]!;
      let siblingFinal: FullTransaction | undefined;

      let targetIndex = index;
      const step = direction === 'up' ? +1 : -1;

      while (true) {
        targetIndex += step;
        if (targetIndex < 0 || targetIndex >= sameDateTransactions.length) {
          break;
        }
        const candidate = sameDateTransactions[targetIndex]!;
        if (txFinal.transferHash && candidate.transferHash === txFinal.transferHash) {
          continue; // Skip the other half of the same transfer block
        }
        siblingFinal = candidate;
        break;
      }

      if (siblingFinal) {
        const tempOrder = txFinal.order!;
        const siblingOrder = siblingFinal.order!;

        const idsToUpdateToSiblingOrder = [txFinal.id];
        if (txFinal.transferHash) {
          const rev = this.getReverseByIdAndHash(txFinal.id, txFinal.transferHash);
          if (rev) idsToUpdateToSiblingOrder.push(rev.id);
        }

        const idsToUpdateToTempOrder = [siblingFinal.id];
        if (siblingFinal.transferHash) {
          const rev = this.getReverseByIdAndHash(siblingFinal.id, siblingFinal.transferHash);
          if (rev) idsToUpdateToTempOrder.push(rev.id);
        }

        for (const updateId of idsToUpdateToSiblingOrder) {
          const storeIdx = this.getIndexById(updateId);
          if (storeIdx !== -1) {
            const updated = { ...newTransactions[storeIdx]!, order: siblingOrder };
            newTransactions[storeIdx] = updated;
            updatesToSync.push(updated);
          }
        }

        for (const updateId of idsToUpdateToTempOrder) {
          const storeIdx = this.getIndexById(updateId);
          if (storeIdx !== -1) {
            const updated = { ...newTransactions[storeIdx]!, order: tempOrder };
            newTransactions[storeIdx] = updated;
            updatesToSync.push(updated);
          }
        }
      }

      this.$state.transactions = newTransactions;

      const uniqueUpdates = new Map<string, FullTransaction>();
      for (const u of updatesToSync) uniqueUpdates.set(u.id, u);

      if (uniqueUpdates.size > 0) {
        await Promise.all(Array.from(uniqueUpdates.values()).map(t => syncUpdateTransaction(t)));
      }
    },
    async changeAccountName({
      fromName,
      fromId,
      to,
    }: {
      fromName: string;
      fromId: string;
      to: string;
    }) {
      if (fromName === to) return;

      const updatedTransactions: FullTransaction[] = [];
      const newTransactions = this.$state.transactions.map((tx) => {
        if (tx.account === fromName || tx.accountId === fromId) {
          const updated = { ...tx, account: to };
          updatedTransactions.push(updated);
          return updated;
        } else if (tx.category === `[${fromName}]`) {
          const updated = { ...tx, category: `[${to}]` };
          updatedTransactions.push(updated);
          return updated;
        } else {
          return tx;
        }
      });
      this.$state.transactions = newTransactions;

      if (updatedTransactions.length > 0) {
        await syncUpdateTransactionBatch(updatedTransactions);
      }
    },
    getAllByAccountId(accountId: string): FullTransaction[] {
      return this.$state.transactions.filter(
        (tx) => tx.accountId === accountId,
      );
    },
    getById(id: string): FullTransaction | undefined {
      return this.$state.transactions.find((t) => t.id === id);
    },
    getReverseByIdAndHash(
      id: string,
      transferHash: string | undefined,
    ): FullTransaction | undefined {
      if (!transferHash) return undefined;
      return this.$state.transactions.find(
        (t) => t.transferHash === transferHash && t.id !== id,
      );
    },
    getIndexById(id: string): number {
      return this.$state.transactions.findIndex((t) => t.id === id);
    },
    getReverseIndexByIdAndHash(
      id: string,
      transferHash: string | undefined,
    ): number {
      if (!transferHash) return -1;
      return this.$state.transactions.findIndex(
        (t) => t.transferHash === transferHash && t.id !== id,
      );
    },
    getCategoryByPayee(payee: string): string | undefined {
      if (!payee) return undefined;

      let latestTransaction: FullTransaction | undefined;

      for (const transaction of this.$state.transactions) {
        if (transaction.payee === payee && transaction.category) {
          if (!latestTransaction || transaction.date > latestTransaction.date) {
            latestTransaction = transaction;
          }
        }
      }

      return latestTransaction?.category;
    },
    getSiblingsBySplitId(splitId: string): FullTransaction[] {
      return this.$state.transactions.filter((t) => t.splitId === splitId);
    },
    getSuggestedCategory(payee: string): string | undefined {
      if (!payee) return undefined;

      const payeeTransactions = this.$state.transactions.filter(
        (t) => t.payee === payee && t.category,
      );

      if (payeeTransactions.length === 0) return undefined;

      const categoryCounts = new Map<string, number>();
      for (const t of payeeTransactions) {
        const category = t.category!;
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }

      let bestCategory: string | undefined;
      let maxCount = 0;

      for (const [category, count] of categoryCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestCategory = category;
        }
      }

      return bestCategory;
    },
  },
});
