import { useAccountStore } from '~/store/account';
import { useTransactionStore } from '~/store/transaction';
import { useCategoryStore } from '~/store/category';
import { useProjectStore } from '~/store/project';
import { getAppState } from '~/sync/manager';
import { Trx } from '~/store/transaction.model';
import { sumArray } from '~/store/currency';

export async function hydratePinia() {
    console.log('Hydrating Pinia from Sync State...');

    const state = await getAppState();

    // Safety check: Don't wipe local data with empty sync data
    // (Unless we are explicitly in a "clean slate" mode, but for now this protects the user)
    const syncAccountCount = Object.keys(state.accounts).length;
    const syncTrxCount = Object.keys(state.transactions).length;

    if (syncAccountCount === 0 && syncTrxCount === 0) {
        console.log('Sync state is empty. Skipping UI update to prevent data loss.');
        return;
    }

    const accountStore = useAccountStore();
    const transactionStore = useTransactionStore();

    // 1. Prepare Data
    // Static imports are now safe since Trx is in a separate model file
    const restoredTrx = Object.values(state.transactions);
    // Filter out potential encrypted debris or malformed data to prevent crash
    const validTrx = restoredTrx.filter(t => t && typeof t === 'object' && !('payload' in t)); // 'payload' check is heuristic if wrapper leaked
    // More robust: checks if it looks like a transaction (has amount or id)
    // Actually, just checking typeof t === 'object' should fix the "in operator" error on strings.
    const finalTransactions = restoredTrx
        .filter(t => t && typeof t === 'object')
        .map(t => new Trx(t as any).json);

    // 2. Prepare Accounts with pre-calculated balances
    const finalAccounts = Object.values(state.accounts).map(a => {
        const accountTxs = finalTransactions.filter(t => t.accountId === a.id);
        const balance = sumArray(accountTxs.map(t => t.amount), a.currency);
        return {
            ...a,
            balance
        };
    });

    // 3. Update Stores (Atomic-ish)
    transactionStore.$state.transactions = finalTransactions;
    accountStore.$state.accounts = finalAccounts as any;

    // 4. Restore Categories & Projects
    const categoryStore = useCategoryStore();
    categoryStore.$state.categories = Object.values(state.categories);

    const projectStore = useProjectStore();
    projectStore.$state.projects = Object.values(state.projects);

    console.log(`UI updated: ${syncAccountCount} accounts, ${syncTrxCount} transactions.`);
}
