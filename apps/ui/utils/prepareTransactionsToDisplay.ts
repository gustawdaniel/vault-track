import {
  type FullTransaction,
  isTransferByCategory,
} from '~/store/transaction.model';
import { type Currency, sum } from '~/store/currency';
import { useCategoryStore, decomposeRawCategoryToCategoryAndProject } from '~/store/category';
import { useAccountStore } from '~/store/account';
import { decodeSplitId } from '~/utils/splitIdParams';

export interface ExtendedFullTransaction extends FullTransaction {
  color: string;
  currency: Currency;
  accountSubBalance: number;
}

export interface TransactionFilter {
  accountId?: string;
  accounts?: string[];
  categoryId?: string;
  includeSubcategories?: boolean;
  excludeTransfers?: boolean;
  type?: 'income' | 'expense' | 'all';
  startDate?: string;
  endDate?: string;
  projects?: string[];
}

export function prepareTransactionsToDisplay(
  fullTransactions: FullTransaction[],
  filter: TransactionFilter,
): ExtendedFullTransaction[] {
  const categoryStore = useCategoryStore();
  const accountStore = useAccountStore();

  const transactions = fullTransactions.filter((t) => {
    if (filter) {
      if (filter.accountId && t.accountId !== filter.accountId) return false;
      if (
        filter.accounts &&
        filter.accounts.length > 0 &&
        !filter.accounts.includes(t.accountId)
      )
        return false;

      if (filter.projects && filter.projects.length > 0) {
        const [, project] = decomposeRawCategoryToCategoryAndProject(
          t.category,
        );
        if (!project || !filter.projects.includes(project)) return false;
      }

      if (filter.categoryId) {
        // Strip project from comparison if filtering by category?
        // Usually categoryId filter implies the category part.
        // t.category might be "Food/ProjectA". filter.categoryId is "Food".
        // simple equality fails.
        // We should check the category PART.
        const [catPart] = decomposeRawCategoryToCategoryAndProject(t.category);

        const matchesCategory =
          catPart === filter.categoryId ||
          (filter.includeSubcategories &&
            catPart?.startsWith(filter.categoryId + ':'));

        if (!matchesCategory) return false;
      }

      if (filter.excludeTransfers && isTransferByCategory(t)) return false;

      if (filter.type) {
        if (filter.type === 'expense' && t.amount >= 0) return false;
        if (filter.type === 'income' && t.amount <= 0) return false;
      }

      if (filter.startDate && t.date < filter.startDate) return false;
      if (filter.endDate && t.date > filter.endDate) return false;
    }
    return true;
  });

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
        clone.category = 'Split Transaction';
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

  // Pre-build color cache: Map<category, color> to avoid O(N×C) linear scans
  const colorCache = new Map<string, string>();
  function getCachedColor(category?: string): string {
    if (!category) return 'transparent';
    if (category === 'Split Transaction') return '#7d7d7d';
    if (colorCache.has(category)) return colorCache.get(category)!;
    const color = categoryStore.getColorByCategory(category);
    colorCache.set(category, color);
    return color;
  }

  // Pre-build account cache: Map<accountId, account> to avoid O(N×A) linear scans
  const accountCache = new Map<string, { currency: Currency }>();
  function getCachedAccount(accountId: string): { currency: Currency } {
    if (accountCache.has(accountId)) return accountCache.get(accountId)!;
    const account = accountStore.getById(accountId);
    const result = { currency: account ? account.currency : 'USD' as Currency };
    accountCache.set(accountId, result);
    return result;
  }

  const extendedTransactions = groupedTransactions.map((t) => {
    const color = getCachedColor(t.category);
    const { currency } = getCachedAccount(t.accountId);
    return {
      ...t,
      color,
      currency,
      accountSubBalance: 0,
    };
  });

  let subBalance = 0;

  extendedTransactions.sort((a, b) => {
    const dateCompare = (a.date || '').localeCompare(b.date || '');
    if (dateCompare !== 0) return dateCompare;
    return a.id.localeCompare(b.id);
  });

  for (const transaction of extendedTransactions) {
    subBalance = sum(subBalance, transaction.amount, transaction.currency);
    transaction.accountSubBalance = subBalance;
  }

  return extendedTransactions;
}
