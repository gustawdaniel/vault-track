import { uid } from 'uid';
import type {
  CommonTransactionContext,
  TransactionContext,
  TransferContext,
} from './types';
import {
  type FullTransaction,
  getTransactionNormalType,
  getTransferTransactionOrder,
  isTransferByCategory,
} from '~/store/transaction';
import { getFullProjectName } from '~/store/project';
import { getClearedStatusFromString } from '~/store/clearedStatus';
import { getFullCategoryName } from '~/store/category';
import { useAccountStore } from '~/store/account';

export function transactionToContext(
  transaction: FullTransaction,
  reverseTransaction?: FullTransaction,
): TransactionContext {
  const common: CommonTransactionContext = {
    payee: transaction.payee,
    date: transaction.date,
    memo: transaction.memo,
    projectName: getFullProjectName(transaction),
  };

  if (isTransferByCategory(transaction)) {
    const accountStore = useAccountStore();

    const transferContext: TransferContext = {
      type: 'transfer',
      fromAccountId: '',
      fromId: '',
      toAccountId: '',
      toId: '',
      fromAbsoluteAmount: 0,
      toAbsoluteAmount: 0,
      fromClearedStatus: '',
      toClearedStatus: '',
    };

    if (reverseTransaction) {
      const { from, to } = getTransferTransactionOrder(
        transaction,
        reverseTransaction,
      );

      transferContext.fromId = from.id;
      transferContext.fromAccountId = accountStore.getAccountIdByName(
        from.account,
      );
      transferContext.toId = to.id;
      transferContext.toAccountId = accountStore.getAccountIdByName(to.account);

      const fromFullTransaction: FullTransaction | undefined = [
        transaction,
        reverseTransaction,
      ].find((t) => t.id === from.id);

      if (!fromFullTransaction)
        throw new Error(`from full transaction with id ${from.id} not found`);

      const toFullTransaction: FullTransaction | undefined = [
        transaction,
        reverseTransaction,
      ].find((t) => t.id === to.id);

      if (!toFullTransaction)
        throw new Error(`to full transaction with id ${from.id} not found`);

      transferContext.fromAbsoluteAmount = Math.abs(fromFullTransaction.amount);
      transferContext.toAbsoluteAmount = Math.abs(toFullTransaction.amount);
      transferContext.fromClearedStatus = getClearedStatusFromString(
        fromFullTransaction.clearedStatus,
      );
      transferContext.toClearedStatus = getClearedStatusFromString(
        toFullTransaction.clearedStatus,
      );
    } else {
      const from = transaction;
      transferContext.fromId = from.id;
      transferContext.fromAccountId = accountStore.getAccountIdByName(
        from.account,
      );
      transferContext.fromAbsoluteAmount = Math.abs(from.amount);
      transferContext.fromClearedStatus = getClearedStatusFromString(
        from.clearedStatus,
      );

      transferContext.toId = uid();
      transferContext.toAccountId =
        accountStore.getFirstAccountIdToTransferFromName(transaction.account);
      transferContext.toAbsoluteAmount = 0;
    }

    return {
      ...common,
      ...transferContext,
    };
  } else {
    return {
      ...common,
      type: getTransactionNormalType(transaction),
      categoryName: getFullCategoryName(transaction),
      absoluteAmount: Math.abs(transaction.amount),
      accountId: transaction.accountId,
      clearedStatus: getClearedStatusFromString(transaction.clearedStatus),
    };
  }
}
