import type {
  NormalTransactionContext,
  TransactionContext,
  TransferContext,
} from './types';
import { useAccountStore } from '~/store/account';

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
      return {
        type: 'transfer',
        fromAbsoluteAmount: currentState.absoluteAmount,
        fromAccountId: accountStore.getFirstAccountIdToTransferFromId(
          currentState.accountId,
        ),
        fromClearedStatus: currentState.clearedStatus,
        toAccountId: currentState.accountId,
        toAbsoluteAmount: currentState.absoluteAmount,
      };
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
  }
}
