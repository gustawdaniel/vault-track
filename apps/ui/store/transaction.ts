import { RemovableRef, useLocalStorage } from '@vueuse/core';
import hash from 'object-hash';

import { defineStore } from 'pinia';
import { z } from 'zod';
import { uid } from 'uid';
import { useAccountStore } from '~/store/account';

export const TransactionModel = z.object({
  id: z.string(),
  account: z.string(),
  accountId: z.string(),
  amount: z.number(),
  category: z.string().optional(),
  date: z.string(),
  payee: z.string().optional(),
  memo: z.string().optional(),
  clearedStatus: z.enum(['*', 'X', '?']).optional(),
});

export interface Transaction {
  account: string;
  accountId: string;
  amount: number;
  category?: string;
  date: string;
  payee?: string;
  memo?: string;
  clearedStatus?: string;
}

interface PersistedTransaction extends Transaction {
  id: string;
}

export interface FullTransaction extends PersistedTransaction {
  hash: string;
}

interface State {
  transactions: RemovableRef<FullTransaction[]>;
}

class Trx {
  data: PersistedTransaction;

  constructor(transaction: Transaction | PersistedTransaction) {
    this.data = {
      ...transaction,
      id: 'id' in transaction ? transaction.id : uid(),
    };
  }

  _hash: string | undefined;

  get hash(): string {
    if (this._hash) {
      return this._hash;
    }

    const computedHash = hash(this.data);
    this._hash = computedHash;
    return computedHash;
  }

  get id(): string {
    return this.data.id;
  }

  get json(): FullTransaction {
    return {
      ...this.data,
      hash: this.hash,
    };
  }
}

export interface CreateTransactionOptions {
  allowDuplicates: boolean;
}

export const useTransactionStore = defineStore('transaction', {
  state: (): State => ({
    transactions: useLocalStorage<FullTransaction[]>('transaction', []),
  }),
  actions: {
    create(transaction: Transaction, options?: CreateTransactionOptions) {
      const trx = new Trx(transaction);

      const index = this.$state.transactions.findIndex(
        (a) => a.hash === trx.hash,
      );
      if (index === -1 || Boolean(options?.allowDuplicates)) {
        this.$state.transactions.push(trx.json);
      } else {
        this.$state.transactions.splice(index, 1, trx.json);
      }
    },
    update(id: string, transaction: Transaction) {
      const newTrx = new Trx({ ...transaction, id });

      const index = this.$state.transactions.findIndex(
        (a) => a.id === newTrx.id,
      );
      if (index !== -1) {
        const oldTrx = new Trx(this.$state.transactions[index]);
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
      }
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
  },
});
