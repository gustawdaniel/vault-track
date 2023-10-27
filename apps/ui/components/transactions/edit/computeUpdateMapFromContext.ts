import { uid } from 'uid';
import {
  CommonTransactionContext,
  ComputedNormalAccount,
  ComputedTransferAccounts,
  NormalTransactionContext,
  TransactionContext,
} from './types';
import { Transaction } from '~/store/transaction';
import { composeRawCategoryFromCategoryAndProject } from '~/store/category';

function getAmountFromNormalContext(data: NormalTransactionContext): number {
  switch (data.type) {
    case 'income':
      return data.absoluteAmount;
    case 'expense':
      return -data.absoluteAmount;
    default:
      return 0;
  }
}

export function computeUpdateMapFromContext(
  propsTransactionId: string,
  context: TransactionContext,
  normalAccount: ComputedNormalAccount,
  transferAccount: ComputedTransferAccounts,
): Map<string, Transaction> {
  console.log(propsTransactionId, context, normalAccount, transferAccount);

  const updates = new Map<string, Transaction>();

  if (context.type === 'income' || context.type === 'expense') {
    const account = normalAccount;
    if (!account) {
      throw new Error(`Current account not found for id ${context.accountId}`);
    }

    updates.set(propsTransactionId, {
      amount: getAmountFromNormalContext(context),
      accountId: context.accountId,
      account: account.name,
      date: context.date,
      memo: context.memo,
      category: composeRawCategoryFromCategoryAndProject(
        context.categoryName,
        context.projectName,
      ),
      payee: context.payee,
      clearedStatus: context.clearedStatus,
    });
  } else if (context.type === 'transfer') {
    const accounts = transferAccount;
    if (!accounts.from)
      throw new Error(`Account from ${context.fromAccountId} not found`);
    if (!accounts.to)
      throw new Error(`Account to ${context.toAccountId} not found`);

    const commonUpdatePayload: CommonTransactionContext = {
      date: context.date,
      payee: context.payee,
      memo: context.memo,
    };

    const fromId: string = context.fromId ?? propsTransactionId ?? uid();

    updates.set(fromId, {
      amount: -context.fromAbsoluteAmount,
      ...commonUpdatePayload,
      account: accounts.from.name,
      accountId: accounts.from.id,
      clearedStatus: context.fromClearedStatus,
      category: composeRawCategoryFromCategoryAndProject(
        `[${accounts.to.name}]`,
        context.projectName,
      ),
    });

    if (accounts.from.currency === accounts.to.currency) {
      context.toAbsoluteAmount = context.fromAbsoluteAmount;
    }

    updates.set(context.toId ?? uid(), {
      amount: context.toAbsoluteAmount,
      ...commonUpdatePayload,
      account: accounts.to.name,
      accountId: accounts.to.id,
      clearedStatus: context.toClearedStatus,
      category: composeRawCategoryFromCategoryAndProject(
        `[${accounts.from.name}]`,
        context.projectName,
      ),
    });
  }

  if (context.type === 'expense' || context.type === 'income') {
    if (updates.size !== 1)
      throw new Error(`Expense or income should contain only one update`);
  } else if (context.type === 'transfer') {
    if (updates.size !== 2)
      throw new Error(`Transfer should contain exactly 2 updates`);
  }

  return updates;
}
