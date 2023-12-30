import type { Transaction } from '~/store/transaction';

export type UploadTransactionsHeaderType = keyof Transaction | 'fee' | 'state';
