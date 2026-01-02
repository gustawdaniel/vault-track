import type { Data } from 'qif2json/src/lib/types';
import type { QifAccount } from 'qif-ts';
import { useAccountStore } from '~/store/account';
import { type Category, useCategoryStore } from '~/store/category';
import {
  type Transaction,
  TransactionModel,
} from '~/store/transaction.model';
import { useTransactionStore } from '~/store/transaction';

export function loadDataToStore(payload: Data): void {
  const storeAccount = useAccountStore();
  const categoryStore = useCategoryStore();
  const transactionStore = useTransactionStore();

  for (const account of payload.accounts ?? []) {
    // @ts-ignore
    if (account.name) storeAccount.create(<QifAccount>account);
  }

  for (const category of payload.categories ?? [])
    if (category.category) categoryStore.create(<Category>category);

  const allowDuplicates = transactionStore.transactions.length === 0;
  for (const transactionEntity of payload.transactions ?? []) {
    if (!transactionEntity.account) continue;
    const account = storeAccount.getByName(transactionEntity.account);
    if (!account) continue;

    const valid = TransactionModel.omit({
      id: true,
      accountId: true,
    }).safeParse(transactionEntity);

    if (!valid.success) {
      alert(
        `Error, Transaction: ${JSON.stringify(
          transactionEntity,
        )} is not valid, details: ${JSON.stringify(valid.error)}`,
      );
      throw valid.error;
    }

    const transaction: Transaction = {
      account: valid.data.account,
      accountId: account.id,
      amount: valid.data.amount,
      category: valid.data.category,
      date: valid.data.date,
      payee: valid.data.payee,
      memo: valid.data.memo,
      clearedStatus: valid.data.clearedStatus,
    };

    transactionStore.create(transaction, {
      allowDuplicates,
      updateAccountBalance: false,
    });
  }
}
