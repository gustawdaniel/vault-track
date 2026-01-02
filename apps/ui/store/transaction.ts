import { type RemovableRef, useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import dayjs from 'dayjs';
import { useAccountStore } from '~/store/account';
import { getFullProjectName } from '~/store/project';
import { createTransaction as syncCreateTransaction, updateTransaction as syncUpdateTransaction, deleteTransaction as syncDeleteTransaction } from '~/sync/manager';
import {
  Trx,
  type Transaction,
  type FullTransaction,
  type PersistedTransaction,
  type CreateTransactionOptions
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
    update(id: string, transaction: Transaction) {
      const newTrx = new Trx({ ...transaction, id });
      const index = this.getIndexById(newTrx.id);
      if (index !== -1) {
        const oldTrxData = this.$state.transactions[index];
        if (!oldTrxData) throw new Error('Transaction not found');
        const oldTrx = new Trx(oldTrxData);
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
          Object.assign(oldTrx.json, newTrx.json),
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
        this.create(
          { ...transaction, id },
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
  },
});
