import type { QifAccount, QifAccountType } from 'qif-ts';
import { defineStore } from 'pinia';
import { RemovableRef, useLocalStorage } from '@vueuse/core';
import { uid } from 'uid';
import { z } from 'zod';
import { useTransactionStore } from '~/store/transaction';
import { Currency, sumArray, getCurrency, sum } from '~/store/currency';

export const AccountModel = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['Cash', 'Bank', 'Invst', 'CCard']),
  currency: z.string().optional(), // z.enum(currencies).optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  hidden: z.boolean().optional(),
});

export type AccountType = QifAccountType | 'Invst';

export interface Account extends Omit<QifAccount, 'type' | 'currency'> {
  type: AccountType;
  currency: Currency;
  id: string;
}

export interface ComputedAccount extends Account {
  balance: number;
}

interface State {
  accounts: RemovableRef<ComputedAccount[]>;
}

export const useAccountStore = defineStore('account', {
  state: (): State => ({
    accounts: useLocalStorage<ComputedAccount[]>('account', []),
  }),
  actions: {
    create(account: QifAccount) {
      const index = this.$state.accounts.findIndex(
        (a) => a.name === account.name,
      );
      if (index === -1) {
        const accountToSave = {
          id: uid(),
          ...account,
          balance: 0,
          currency: getCurrency(account.currency),
        };

        const p = AccountModel.safeParse(accountToSave);
        if (p.success) this.$state.accounts.push(accountToSave);
        else {
          throw p.error;
        }
      } else {
        this.$state.accounts.splice(
          index,
          1,
          Object.assign(this.$state.accounts[index], account),
        );
      }
    },
    update(accountId: string, accountData: Omit<Account, 'id'>) {
      const index = this.getIndexById(accountId);
      if (index === -1) throw new Error(`Account ${accountId} not found`);

      const foundAccount = this.$state.accounts[index];

      if (accountData.name !== foundAccount.name) {
        const transactionStore = useTransactionStore();

        transactionStore.changeAccountName({
          fromId: foundAccount.id,
          fromName: foundAccount.name,
          to: accountData.name,
        });
      }

      this.$state.accounts.splice(
        index,
        1,
        Object.assign(foundAccount, accountData),
      );
    },
    pathBalance(accountId: string, diff: number) {
      const account = this.getById(accountId);
      if (account) {
        account.balance = sum(account.balance, diff, account.currency);
      }
    },
    getIndexById(accountId: string): number {
      return this.$state.accounts.findIndex((a) => a.id === accountId);
    },
    computeBalanceById(accountId: string) {
      const transactionStore = useTransactionStore();
      const account = this.getById(accountId);
      if (!account) return;

      const balance = sumArray(
        transactionStore.getAllByAccountId(accountId).map((tx) => tx.amount),
        account.currency,
      );

      if (account) {
        account.balance = balance;
      }
    },
    computeAllBalances() {
      for (const account of this.$state.accounts) {
        this.computeBalanceById(account.id);
      }
    },
    getByName(name: string): Account | undefined {
      return this.$state.accounts.find((a) => a.name === name);
    },
    getById(id: string): ComputedAccount | undefined {
      return this.$state.accounts.find((a) => a.id === id);
    },
  },
});
