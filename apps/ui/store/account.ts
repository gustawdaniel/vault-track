import type { QifAccount, QifAccountType } from 'qif-ts';
import { defineStore } from 'pinia';
import { RemovableRef, useLocalStorage } from '@vueuse/core';
import { uid } from 'uid';
import z from 'zod';

export const AccountModel = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['Cash', 'Bank', 'Card', 'CCard']),
  currency: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  hidden: z.boolean().optional(),
});

export interface Account extends QifAccount {
  type: QifAccountType | 'CCard';
  id: string;
}

interface State {
  accounts: RemovableRef<Account[]>;
}

export const useAccountStore = defineStore('account', {
  state: (): State => ({
    accounts: useLocalStorage<Account[]>('account', []),
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
    getByName(name: string): Account | undefined {
      return this.$state.accounts.find((a) => a.name === name);
    },
  },
});
