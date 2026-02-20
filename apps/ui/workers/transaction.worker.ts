import { prepareTransactionsToDisplayCore, type TransactionFilter } from '../utils/prepareTransactionsToDisplay.core';
import type { FullTransaction } from '../store/transaction.model';
import type { PersistedCategory } from '../utils/category';
import type { Account } from '../store/account.model';

interface WorkerMessage {
    transactions: FullTransaction[];
    filter: TransactionFilter;
    categories: PersistedCategory[];
    accounts: Account[];
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
    try {
        const { transactions, filter, categories, accounts } = e.data;
        // console.time('Worker:prepareTransactionsToDisplay');
        const result = prepareTransactionsToDisplayCore(transactions, filter, categories, accounts);
        // console.timeEnd('Worker:prepareTransactionsToDisplay');
        self.postMessage(result);
    } catch (err) {
        console.error('Worker processing error:', err);
    }
};
