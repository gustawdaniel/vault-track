import { useCategoryStore } from '~/store/category';
import { useAccountStore } from '~/store/account';
import {
  prepareTransactionsToDisplayCore,
  type ExtendedFullTransaction,
  type TransactionFilter
} from './prepareTransactionsToDisplay.core';
import type { FullTransaction } from '~/store/transaction.model';

// Re-export types for consumers
export type { ExtendedFullTransaction, TransactionFilter };

/**
 * Main thread version of prepareTransactionsToDisplay.
 * It automatically uses Pinia stores to get dependencies.
 * usage: verify performance or backward compatibility.
 */
export function prepareTransactionsToDisplay(
  fullTransactions: FullTransaction[],
  filter: TransactionFilter,
): ExtendedFullTransaction[] {
  const categoryStore = useCategoryStore();
  const accountStore = useAccountStore();

  // Pass raw arrays from store (RemovableRef/ComputedRef unwraps to array proxy)
  // prepareTransactionsToDisplayCore expects arrays.
  return prepareTransactionsToDisplayCore(
    fullTransactions,
    filter,
    categoryStore.categories,
    accountStore.accounts
  );
}
