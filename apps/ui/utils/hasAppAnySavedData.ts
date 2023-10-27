import { useAccountStore } from '~/store/account';
import { useCategoryStore } from '~/store/category';
import { useProjectStore } from '~/store/project';
import { useTransactionStore } from '~/store/transaction';

export function hasAppAnySavedData(): boolean {
  const accountStore = useAccountStore();
  const categoryStore = useCategoryStore();
  const projectsStore = useProjectStore();
  const transactionStore = useTransactionStore();

  return Boolean(
    accountStore.accounts.length +
      transactionStore.transactions.length +
      categoryStore.categories.length +
      projectsStore.projects.length,
  );
}
