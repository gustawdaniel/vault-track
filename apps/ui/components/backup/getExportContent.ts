import { type QifAccount, QifType, serializeQif } from 'qif-ts';

import { useAccountStore } from '~/store/account';
import { useTransactionStore } from '~/store/transaction';
import { useCategoryStore } from '~/store/category';

export function getExportContent(type: 'qif' | 'json') {
  const accountStore = useAccountStore();
  const transactionStore = useTransactionStore();
  const categoryStore = useCategoryStore();

  switch (type) {
    case 'qif':
      return serializeQif({
        type: QifType.Account,
        transactions: transactionStore.transactions,
        accounts: accountStore.accounts as QifAccount[],
      });
    case 'json':
      return JSON.stringify({
        transactions: transactionStore.transactions,
        accounts: accountStore.accounts,
        categories: categoryStore.categories,
      });
  }
}
