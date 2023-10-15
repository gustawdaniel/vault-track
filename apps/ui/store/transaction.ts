import { RemovableRef, useLocalStorage } from '@vueuse/core';
import hash from 'object-hash';

import { defineStore } from 'pinia';
import z from 'zod';

export const TransactionModel = z.object({
  id: z.string(),
  account: z.string(),
  accountId: z.string(),
  amount: z.number(),
  category: z.string().optional(),
  date: z.string(),
  payee: z.string().optional(),
  memo: z.string().optional(),
});

export interface Transaction {
  account: string;
  accountId: string;
  amount: number;
  category?: string;
  date: string;
  payee?: string;
  memo?: string;
}

interface FullTransaction extends Transaction {
  hash: string;
}

interface State {
  transactions: RemovableRef<FullTransaction[]>;
}

class Trx {
  data: Transaction;

  constructor(transaction: Transaction) {
    this.data = transaction;
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
  },
});
