import type { QifAccount, QifAccountType } from 'qif-ts';
import { defineStore } from 'pinia';
import { type RemovableRef, useLocalStorage } from '@vueuse/core';
import { uid } from 'uid';
import { z } from 'zod';
import { useTransactionStore } from '~/store/transaction';
import { type Currency, sumArray, getCurrency, sum } from '~/store/currency';
import { createAccount as syncCreateAccount, updateAccount as syncUpdateAccount, deleteAccount as syncDeleteAccount, reorderAccounts as syncReorderAccounts } from '~/sync/manager';

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
  order?: number;
}

export interface ComputedAccount extends Account {
  balance: number;
}

interface State {
  accounts: RemovableRef<ComputedAccount[]>;
  showHidden: RemovableRef<boolean>;
}

export const useAccountStore = defineStore('account', {
  state: (): State => ({
    accounts: useLocalStorage<ComputedAccount[]>('account', []),
    showHidden: useLocalStorage<boolean>('account-show-hidden', false),
  }),
  actions: {
    toggleShowHidden() {
      this.showHidden = !this.showHidden;
    },
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
          order: this.$state.accounts.length,
        };

        const p = AccountModel.safeParse(accountToSave);
        if (p.success) {
          this.$state.accounts.push(accountToSave);
          syncCreateAccount(accountToSave);
        }
        else {
          throw p.error;
        }
      } else {
        const updated = Object.assign(this.$state.accounts[index], account);
        this.$state.accounts.splice(index, 1, updated);
        syncUpdateAccount(updated);
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
        syncUpdateAccount(foundAccount);
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

      // Cascade delete transactions
      const transactionStore = useTransactionStore();
      const transactions = transactionStore.getAllByAccountId(id);
      transactions.forEach(tx => transactionStore.delete(tx.id));

      this.$state.accounts.splice(index, 1);
      syncDeleteAccount(id);
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
    reorder(reorderedAccounts: Account[]) {
      // Get the current order values of the visible accounts and sort them
      const currentOrders = reorderedAccounts
        .map((a) => this.getById(a.id)?.order ?? 0)
        .sort((a, b) => a - b);

      // If we don't have orders (e.g. all 0), generate sequence relative to min or 0
      if (currentOrders.every(o => o === 0) && reorderedAccounts.length > 0) {
        reorderedAccounts.forEach((account, index) => {
          const acc = this.getById(account.id);
          if (acc) acc.order = index;
        });
        return;
      }

      // Re-assign these sorted order values to the accounts in their new sequence
      reorderedAccounts.forEach((account, index) => {
        const acc = this.getById(account.id);
        if (acc) {
          acc.order = currentOrders[index] !== undefined ? currentOrders[index] : index;
        }
      });

      syncReorderAccounts(reorderedAccounts.map((a, i) => {
        // Careful: we want to send the new order for each account ID.
        // The local logic above already mutated the store.
        // The event payload expects { accountId, order }.
        const acc = this.getById(a.id);
        return { accountId: a.id, order: acc?.order ?? i };
      }));
    },
  },
  getters: {
    sortedAccounts: (state): ComputedAccount[] => {
      return [...state.accounts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
  },
});
