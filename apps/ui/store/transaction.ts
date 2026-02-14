import { type RemovableRef, useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import dayjs from 'dayjs';
import { useAccountStore } from '~/store/account';
import {
  createTransaction as syncCreateTransaction,
  updateTransaction as syncUpdateTransaction,
  deleteTransaction as syncDeleteTransaction,
} from '~/sync/manager';
import {
  Trx,
  type Transaction,
  type FullTransaction,
  type PersistedTransaction,
  type CreateTransactionOptions,
} from '~/store/transaction.model';

// Re-export for compatibility
export * from '~/store/transaction.model';

interface State {
  transactions: RemovableRef<FullTransaction[]>;
}

export const useTransactionStore = defineStore('transaction', {
  state: (): State => ({
    transactions: useLocalStorage<FullTransaction[]>('transaction', []),
  }),
  actions: {
    create(
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

        this.$state.transactions.push(trx.json);
        syncCreateTransaction(trx.json);
      } else {
        this.$state.transactions.splice(index, 1, trx.json);
        syncUpdateTransaction(trx.json);
      }
    },
    update(id: string, transaction: Partial<Transaction>) {
      const index = this.getIndexById(id);
      if (index !== -1) {
        const oldTrxData = this.$state.transactions[index];
        if (!oldTrxData) throw new Error('Transaction not found');
        const oldTrx = new Trx(oldTrxData);

        // Merge old data with new partial data
        const newTrxData = { ...oldTrx.data, ...transaction, id };

        // If it was a transfer but now isn't (category changed), remove transferHash
        if (oldTrx.data.transferHash && !isTransferByCategory(newTrxData)) {
          delete newTrxData.transferHash;
        }

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

        this.$state.transactions.splice(
          index,
          1,
          newTrx.json,
        );
        syncUpdateTransaction(newTrx.json);

        if (oldTrx.data.transferHash && !newTrx.data.transferHash) {
          const reverse = this.getReverseByIdAndHash(
            id,
            oldTrx.data.transferHash,
          );
          const reverseIndex = this.getReverseIndexByIdAndHash(
            id,
            oldTrx.data.transferHash,
          );
          if (!reverse || reverseIndex === -1) return;

          accountStore.pathBalance(reverse.accountId, -reverse.amount);
          this.$state.transactions.splice(reverseIndex, 1);
        }
      } else {
        // Fallback for creating if not found? 
        // Original code called create. If partial, create might fail if missing fields.
        // Assuming create needs full objects or defaults. 
        // If transaction is Partial, we can't really create a valid transaction easily without defaults.
        // But getNew() exists?
        // Let's keep original behavior but warn it might be incomplete if transaction is partial.
        this.create(
          { ...transaction, id } as any,
          {
            allowDuplicates: true,
            updateAccountBalance: true,
          },
        );
      }
    },
    delete(id: string): void {
      const transaction = this.getById(id);
      const index = this.getIndexById(id);
      if (!transaction || index === -1) return;

      const accountStore = useAccountStore();

      accountStore.pathBalance(transaction.accountId, -transaction.amount);
      this.$state.transactions.splice(index, 1);
      syncDeleteTransaction(id);

      if (transaction.transferHash) {
        const reverse = this.getReverseByIdAndHash(
          id,
          transaction.transferHash,
        );
        const reverseIndex = this.getReverseIndexByIdAndHash(
          id,
          transaction.transferHash,
        );
        if (!reverse || reverseIndex === -1) return;

        accountStore.pathBalance(reverse.accountId, -reverse.amount);
        this.$state.transactions.splice(reverseIndex, 1);
      }
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
        date: dayjs()
          .set('h', 0)
          .set('m', 0)
          .set('s', 0)
          .format('YYYY-MM-DDTHH:mm:ss'),
        amount: 0,
      }).json;
    },
    changeAccountName({
      fromName,
      fromId,
      to,
    }: {
      fromName: string;
      fromId: string;
      to: string;
    }) {
      if (fromName === to) return;

      this.$state.transactions = this.$state.transactions.map((tx) => {
        if (tx.account === fromName || tx.accountId === fromId) {
          return Object.assign(tx, { account: to });
        } else if (tx.category === `[${fromName}]`) {
          return Object.assign(tx, { category: `[${to}]` });
        } else {
          return tx;
        }
      });
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
