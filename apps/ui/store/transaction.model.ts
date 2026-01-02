import { z } from 'zod';
import { uid } from 'uid';
import hash from 'object-hash';
import type { ClearedStatus } from '~/store/clearedStatus';

export const TransactionModel = z.object({
    id: z.string(),
    account: z.string(),
    accountId: z.string(),
    amount: z.number(),
    category: z.string().optional(),
    date: z.string(),
    payee: z.string().optional(),
    memo: z.string().optional(),
    clearedStatus: z.enum(['', '*', 'X', '?']).optional(),
});

export interface Transaction {
    account: string;
    accountId: string;
    amount: number;
    category?: string;
    date: string;
    payee?: string;
    memo?: string;
    clearedStatus?: ClearedStatus;
}

export interface PersistedTransaction extends Transaction {
    id: string;
    transferHash?: string;
}

export interface FullTransaction extends PersistedTransaction {
    hash: string;
}

export type NormalTransactionContextType = 'expense' | 'income';

export function getFullCategoryName(
    transaction: Pick<Transaction, 'category'>,
): string | undefined {
    return transaction.category;
}

export function isTransferByCategory(
    transaction: Pick<FullTransaction, 'category'>,
): boolean {
    const categoryName = getFullCategoryName(transaction);

    return Boolean(
        categoryName && categoryName.startsWith('[') && categoryName.endsWith(']'),
    );
}

export function getTransactionNormalType(
    transaction: Pick<Transaction, 'amount'>,
): NormalTransactionContextType {
    return transaction.amount > 0 ? 'income' : 'expense';
}

export function getAccountNameFromCategory(
    transaction: Pick<Transaction, 'category'>,
): string | undefined {
    if (isTransferByCategory(transaction)) {
        const categoryName = getFullCategoryName(transaction);
        if (!categoryName) return categoryName;
        return categoryName.substring(1, categoryName.length - 1);
    }
}

// amount is excluded because there can be different currencies
export interface TransactionInvariant {
    fromAccount: string;
    toAccount: string;
    date: string;
    payee?: string;
    project?: string;
    memo?: string;
}

const TransactionInvariantModel = z.object({
    fromAccount: z.string(),
    toAccount: z.string(),
    date: z.string(),
    payee: z.string().optional(),
    project: z.string().optional(),
    memo: z.string().optional(),
});

// Helper needed to avoid circular dependency on Project store
export function getFullProjectName(transaction: any): string | undefined {
    // Basic implementation or assume optional
    return undefined;
}

function getTransactionInvariant(
    transaction: Pick<
        Transaction,
        'account' | 'category' | 'payee' | 'date' | 'memo' | 'amount'
    >,
): TransactionInvariant {
    // from Account is account if an amount is negative, but account(category) is an amount is positive
    const type = getTransactionNormalType(transaction);
    const [fromAccount, toAccount] =
        type === 'income'
            ? [getAccountNameFromCategory(transaction), transaction.account]
            : [transaction.account, getAccountNameFromCategory(transaction)];

    const validModel = TransactionInvariantModel.safeParse({
        fromAccount,
        toAccount,
        date: transaction.date,
        payee: transaction.payee,
        project: getFullProjectName(transaction),
        memo: transaction.memo,
    });

    if (!validModel.success) throw validModel.error;

    return validModel.data;
}

export class Trx {
    data: PersistedTransaction;

    constructor(transaction: Transaction | PersistedTransaction) {
        if (isTransferByCategory(transaction) && !('transferHash' in transaction)) {
            Object.assign(transaction, {
                transferHash: hash(getTransactionInvariant(transaction)),
            });
        }

        this.data = {
            ...transaction,
            id: 'id' in transaction ? transaction.id : uid(),
        };
    }

    _hash: string | undefined;

    get hash(): string {
        if (this._hash) {
            return this._hash;
        }

        const computedHash = hash(this.data);
        this._hash = computedHash;
        return computedHash;
    }

    get id(): string {
        return this.data.id;
    }

    get json(): FullTransaction {
        return {
            ...this.data,
            hash: this.hash,
        };
    }
}
