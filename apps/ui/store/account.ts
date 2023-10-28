import type { QifAccount, QifAccountType } from 'qif-ts';
import { defineStore } from 'pinia';
import { type RemovableRef, useLocalStorage } from '@vueuse/core';
import { uid } from 'uid';
import { z } from 'zod';
import { useTransactionStore } from '~/store/transaction';
import { type Currency, sumArray, getCurrency, sum } from '~/store/currency';

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
    create(account: Omit<Account, 'id'>) {
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
      if (index !== -1) {
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
      } else {
        this.create(accountData);
      }
    },
    pathBalance(accountId: string, diff: number) {
      const account = this.getById(accountId);
      if (account) {
        account.balance = sum(account.balance, diff, account.currency);
      }
    },
    delete(id: string): void {
      const index = this.getIndexById(id);
      if (index === -1) return;
      this.$state.accounts.splice(index, 1);
    },
    getNew(): ComputedAccount {
      return {
        id: uid(),
        name: '',
        type: 'Cash',
        currency: 'USD',
        balance: 0,
      };
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
    getAccountIdByName(name: string): string {
      const account = this.$state.accounts.find((a) => a.name === name);
      if (!account) throw new Error(`Account with name ${name} not found`);
      return account.id;
    },
    getById(id: string): ComputedAccount | undefined {
      return this.$state.accounts.find((a) => a.id === id);
    },
    getFirstAccountIdToTransferFromName(accountName: string): string {
      if (!this.$state.accounts.length)
        throw new Error(`Cant find any account`);
      if (this.$state.accounts.length === 1) return this.$state.accounts[0].id;
      const acc = this.$state.accounts.find((a) => a.name !== accountName);
      if (!acc) throw new Error(`Cant find reverse account to ${accountName}`);
      return acc.id;
    },
    getFirstAccountIdToTransferFromId(id: string): string {
      const acc = this.$state.accounts.find((a) => a.id !== id);
      if (!acc) throw new Error(`Account not found`);
      return acc.id;
    },
  },
});
