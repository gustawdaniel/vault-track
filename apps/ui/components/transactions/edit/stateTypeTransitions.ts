import { uid } from 'uid';
import type {
  NormalTransactionContext,
  TransactionContext,
  TransferContext,
  SplitContext,
} from './types';
import { useAccountStore } from '~/store/account';
import { useCategoryStore } from '~/store/category';

export function transformNormalStateToTransfer(
  currentState: TransactionContext,
): Pick<
  TransferContext,
  | 'type'
  | 'fromAbsoluteAmount'
  | 'fromAccountId'
  | 'fromClearedStatus'
  | 'toAccountId'
  | 'toAbsoluteAmount'
> {
  const accountStore = useAccountStore();

  switch (currentState.type) {
    case 'income':
    case 'split': // Treat split as income/expense base
      // If converting split to transfer, we prob take the sum?
      // For now, let's assume we convert via Normal state or just take 0.
      // But implementation below uses `currentState.absoluteAmount` which split doesn't have.
      // We need to calculate it.
      const amount =
        currentState.type === 'split'
          ? currentState.splits.reduce((sum, s) => sum + s.amount, 0)
          : currentState.absoluteAmount;

      return {
        type: 'transfer',
        fromAbsoluteAmount: amount,
        fromAccountId: accountStore.getFirstAccountIdToTransferFromId(
          currentState.accountId,
        ),
        fromClearedStatus: '', // Split doesn't have cleared status
        toAccountId: currentState.accountId,
        toAbsoluteAmount: amount,
      };

    // ... (expense and transfer cases remain the same, I will only replace the split case logic within transformNormalStateToTransfer)
    // Wait, the tool requires me to replace chunks.
    // I previously replaced the whole switch or large parts.
    // I need to be careful with StartLine.

    // I'll replace the problematic 'split' case in `transformNormalStateToTransfer`.
    // And also `transformSplitToNormal` return object.

    case 'expense':
      return {
        type: 'transfer',
        fromAbsoluteAmount: currentState.absoluteAmount,
        fromAccountId: currentState.accountId,
        fromClearedStatus: currentState.clearedStatus,
        toAccountId: accountStore.getFirstAccountIdToTransferFromId(
          currentState.accountId,
        ),
        toAbsoluteAmount: 0,
      };
    case 'transfer':
      return {
        type: 'transfer',
        fromAbsoluteAmount: currentState.fromAbsoluteAmount,
        fromAccountId: currentState.fromAccountId,
        fromClearedStatus: currentState.fromClearedStatus,
        toAccountId: currentState.toAccountId,
        toAbsoluteAmount: currentState.toAbsoluteAmount,
      };
  }
}

export function transformTransferStateToNormal(
  currentState: TransactionContext,
): Pick<
  NormalTransactionContext,
  'absoluteAmount' | 'clearedStatus' | 'accountId'
> {
  switch (currentState.type) {
    case 'income':
    case 'expense':
      return {
        absoluteAmount: currentState.absoluteAmount,
        clearedStatus: currentState.clearedStatus,
        accountId: currentState.accountId,
      };
    case 'transfer':
      return {
        absoluteAmount: currentState.fromAbsoluteAmount,
        clearedStatus: currentState.fromClearedStatus,
        accountId: currentState.fromAccountId,
      };
    case 'split':
      return {
        absoluteAmount: currentState.splits.reduce((sum, s) => sum + s.amount, 0),
        clearedStatus: '', // Default
        accountId: currentState.accountId,
      };
  }
}

export function transformNormalToSplit(
  currentState: TransactionContext
): Pick<SplitContext, 'type' | 'splits' | 'accountId'> {
  const categoryStore = useCategoryStore();

  // Only valid to transition from Normal (Expense/Income) usually.
  // If coming from Transfer, we need to pick one side? 
  // Let's assume we come from Normal.

  if (currentState.type === 'income' || currentState.type === 'expense') {
    return {
      type: 'split',
      accountId: currentState.accountId,
      splits: [{
        id: uid(),
        amount: currentState.absoluteAmount,
        category: currentState.categoryName,
        memo: currentState.memo, // Use master memo for first split?
        payee: currentState.payee,
      }]
    }
  } else if (currentState.type === 'transfer') {
    return {
      type: 'split',
      accountId: currentState.fromAccountId,
      splits: [{
        id: uid(),
        amount: currentState.fromAbsoluteAmount,
        category: undefined,
      }]
    }
  }

  // Fallback?
  return {
    type: 'split',
    accountId: 'accountId' in currentState ? currentState.accountId : '',
    splits: []
  }
}

export function transformSplitToNormal(
  currentState: TransactionContext
): Pick<NormalTransactionContext, 'type' | 'absoluteAmount' | 'accountId' | 'clearedStatus' | 'categoryName'> {
  if (currentState.type !== 'split') {
    // Should not happen if calling logic is correct
    throw new Error("Expected split state");
  }

  const total = currentState.splits.reduce((sum, s) => sum + s.amount, 0);
  // Determine type based on total? Or default to Expense?
  // Split usually implies Expense flow in this app context (from user requirements).

  return {
    type: 'expense', // Default to expense when converting back
    absoluteAmount: total,
    accountId: currentState.accountId,
    clearedStatus: '' as any, // Cast to any to satisfy strict type if ClearedStatus is enum. 
    // Wait, ClearedStatus is type alias. '' is valid.
    categoryName: currentState.splits[0]?.category // Take first category?
  }
}
