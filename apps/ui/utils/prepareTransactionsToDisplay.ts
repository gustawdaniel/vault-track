import type { FullTransaction } from '~/store/transaction.model';
import { type Currency, sum } from '~/store/currency';
import { useCategoryStore } from '~/store/category';
import { useAccountStore } from '~/store/account';
import { decodeSplitId } from '~/utils/splitIdParams';

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
    .filter((t) => (filter ? t.accountId === filter.accountId : true));

  // Group by splitId
  const groupedTransactions: FullTransaction[] = [];
  const splitMap = new Map<string, FullTransaction>();

  for (const t of transactions) {
    if (t.splitId) {
      const { payee: masterPayee } = decodeSplitId(t.splitId);

      if (splitMap.has(t.splitId)) {
        const existing = splitMap.get(t.splitId)!;
        existing.amount += t.amount;
      } else {
        const clone = { ...t };
        clone.category = "Split Transaction";
        if (masterPayee) {
          clone.payee = masterPayee;
        }
        splitMap.set(t.splitId, clone);
        groupedTransactions.push(clone);
      }
    } else {
      groupedTransactions.push({ ...t });
    }
  }

  const extendedTransactions = groupedTransactions.map((t) => {
    const color = t.category === "Split Transaction" ? "#7d7d7d" : categoryStore.getColorByCategory(t.category);
    // Use gray for split or mixed?
    const account = accountStore.getById(t.accountId);
    return {
      ...t,
      color,
      currency: account ? account.currency : 'USD',
      accountSubBalance: 0,
    };
  });

  let subBalance = 0;

  extendedTransactions.sort((a, b) => a.date.localeCompare(b.date));

  for (const transaction of extendedTransactions) {
    subBalance = sum(subBalance, transaction.amount, transaction.currency);
    transaction.accountSubBalance = subBalance;
  }

  return extendedTransactions;
}
