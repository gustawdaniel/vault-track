import { type RemovableRef, useLocalStorage } from '@vueuse/core';
import hash from 'object-hash';

import { defineStore } from 'pinia';
import { z } from 'zod';
import { uid } from 'uid';
import dayjs from 'dayjs';
import { useAccountStore } from '~/store/account';
import { getFullCategoryName } from '~/store/category';
import { getFullProjectName } from '~/store/project';
import type { ClearedStatus } from '~/store/clearedStatus';

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
  clearedStatus?: ClearedStatus;
}

interface PersistedTransaction extends Transaction {
  id: string;
  transferHash?: string;
}

export interface FullTransaction extends PersistedTransaction {
  hash: string;
}

interface State {
  transactions: RemovableRef<FullTransaction[]>;
}

export function isTransferByCategory(
  transaction: Pick<FullTransaction, 'category'>,
): boolean {
  const categoryName = getFullCategoryName(transaction);

  return Boolean(
    categoryName && categoryName.startsWith('[') && categoryName.endsWith(']'),
  );
}

// amount is excluded because there can be different currencies
export interface TransactionInvariant {
  fromAccount: string;
  toAccount: string;
  date: string;
  payee?: string;
  project?: string;
  memo?: string;
}

export type NormalTransactionContextType = 'expense' | 'income';

export function getTransactionNormalType(
  transaction: Pick<Transaction, 'amount'>,
): NormalTransactionContextType {
  return transaction.amount > 0 ? 'income' : 'expense';
}

export function getAccountNameFromCategory(
  transaction: Pick<Transaction, 'category'>,
): string | undefined {
  if (isTransferByCategory(transaction)) {
    const categoryName = getFullCategoryName(transaction);
    if (!categoryName) return categoryName;
    return categoryName.substring(1, categoryName.length - 1);
  }
}

const TransactionInvariantModel = z.object({
  fromAccount: z.string(),
  toAccount: z.string(),
  date: z.string(),
  payee: z.string().optional(),
  project: z.string().optional(),
  memo: z.string().optional(),
});

function projectIdAndAccount(
  tx: FullTransaction,
): Pick<FullTransaction, 'id' | 'account'> {
  return {
    id: tx.id,
    account: tx.account,
  };
}

export function getTransferTransactionOrder(
  tx1: FullTransaction,
  tx2: FullTransaction,
): {
  from: Pick<FullTransaction, 'id' | 'account'>;
  to: Pick<FullTransaction, 'id' | 'account'>;
} {
  const type = getTransactionNormalType(tx1);
  return type === 'income'
    ? { from: projectIdAndAccount(tx2), to: projectIdAndAccount(tx1) }
    : { from: projectIdAndAccount(tx1), to: projectIdAndAccount(tx2) };
}

function getTransactionInvariant(
  transaction: Pick<
    Transaction,
    'account' | 'category' | 'payee' | 'date' | 'memo' | 'amount'
  >,
): TransactionInvariant {
  // from Account is account if an amount is negative, but account(category) is an amount is positive
  const type = getTransactionNormalType(transaction);
  const [fromAccount, toAccount] =
    type === 'income'
      ? [getAccountNameFromCategory(transaction), transaction.account]
      : [transaction.account, getAccountNameFromCategory(transaction)];

  const validModel = TransactionInvariantModel.safeParse({
    fromAccount,
    toAccount,
    date: transaction.date,
    payee: transaction.payee,
    project: getFullProjectName(transaction),
    memo: transaction.memo,
  });

  if (!validModel.success) throw validModel.error;

  return validModel.data;
}

export class Trx {
  data: PersistedTransaction;

  constructor(transaction: Transaction | PersistedTransaction) {
    if (isTransferByCategory(transaction) && !('transferHash' in transaction)) {
      Object.assign(transaction, {
        transferHash: hash(getTransactionInvariant(transaction)),
      });
    }

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
  updateAccountBalance: boolean;
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
        if (options?.updateAccountBalance) {
          const accountStore = useAccountStore();
          accountStore.pathBalance(trx.data.accountId, trx.data.amount);
        }

        this.$state.transactions.push(trx.json);
      } else {
        this.$state.transactions.splice(index, 1, trx.json);
      }
    },
    update(id: string, transaction: Transaction) {
      const newTrx = new Trx({ ...transaction, id });

      const index = this.getIndexById(newTrx.id);
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
        this.create(transaction, {
          allowDuplicates: true,
          updateAccountBalance: true,
        });
      }
    },
    delete(id: string): void {
      const transaction = this.getById(id);
      const index = this.getIndexById(id);
      if (!transaction || index === -1) return;

      const accountStore = useAccountStore();

      accountStore.pathBalance(transaction.accountId, -transaction.amount);
      this.$state.transactions.splice(index, 1);

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
