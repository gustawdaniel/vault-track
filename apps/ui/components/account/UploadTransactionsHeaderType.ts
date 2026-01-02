import type { Transaction } from '~/store/transaction.model';

export type UploadTransactionsHeaderType = keyof Transaction | 'fee' | 'state';
