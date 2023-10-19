import { ClearedStatus } from '~/store/clearedStatus';
import {
  FullTransaction,
  NormalTransactionContextType,
} from '~/store/transaction';
import { Account } from '~/store/account';

export type TransferContext = {
  type: 'transfer';
  fromAccountId: string;
  toAccountId: string;
  toId: string;
  fromId: string;
  fromAbsoluteAmount: number;
  toAbsoluteAmount: number;
  fromClearedStatus: ClearedStatus;
  toClearedStatus: ClearedStatus;
};

export type CommonTransactionContext = Pick<
  FullTransaction,
  'payee' | 'date' | 'memo'
> & {
  projectName?: string;
};

export type NormalTransactionContext = Pick<FullTransaction, 'accountId'> & {
  absoluteAmount: number;
  type: NormalTransactionContextType;
  clearedStatus: ClearedStatus;
  categoryName?: string;
};

export type TransactionContext = CommonTransactionContext &
  (NormalTransactionContext | TransferContext);

export type ComputedNormalAccount =
  | Pick<Account, 'id' | 'name' | 'currency'>
  | undefined;

export type ComputedTransferAccounts = {
  from: Pick<Account, 'id' | 'name' | 'currency'> | undefined;
  to: Pick<Account, 'id' | 'name' | 'currency'> | undefined;
};
