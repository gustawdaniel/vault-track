import { type FullTransaction } from '~/store/transaction';
import { type Currency, sum } from '~/store/currency';
import { useCategoryStore } from '~/store/category';
import { useAccountStore } from '~/store/account';

export interface ExtendedFullTransaction extends FullTransaction {
  color: string;
  currency: Currency;
  accountSubBalance: number;
}

export interface TransactionFilter {
  accountId?: string;
}

export function prepareTransactionsToDisplay(
  fullTransactions: FullTransaction[],
  filter: TransactionFilter,
): ExtendedFullTransaction[] {
  const categoryStore = useCategoryStore();
  const accountStore = useAccountStore();

  const transactions = fullTransactions
    .filter((t) => (filter ? t.accountId === filter.accountId : true))
    .map((t) => {
      const color = categoryStore.getColorByCategory(t.category);
      const account = accountStore.getById(t.accountId);
      return {
        ...t,
        color,
        currency: account ? account.currency : 'USD',
        accountSubBalance: 0,
      };
    });

  let subBalance = 0;

  transactions.sort((a, b) => a.date.localeCompare(b.date));

  for (const transaction of transactions) {
    subBalance = sum(subBalance, transaction.amount, transaction.currency);
    transaction.accountSubBalance = subBalance;
  }

  return transactions;
}
