import { useAccountStore } from '~/store/account';
import { useTransactionStore } from '~/store/transaction';
import { useCategoryStore } from '~/store/category';
import { useProjectStore } from '~/store/project';
import { useAssertStore } from '~/store/assert';
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

    const accountStore = useAccountStore();
    const transactionStore = useTransactionStore();

    // Check if Pinia has data that would be lost if we hydrated with empty state
    // (This happens if indexedDB is wiped but localStorage persists)
    const hasLocalData = accountStore.accounts.length > 0 || transactionStore.transactions.length > 0;

    if (syncAccountCount === 0 && syncTrxCount === 0) {
        if (hasLocalData) {
            console.warn('[Hydration] Sync state is empty but local data exists. Attempting recovery from server...');

            try {
                // Dynamic import to avoid circular dependency
                const { fetchRemoteEvents } = await import('~/sync/client');
                const { addEvents } = await import('~/sync/db');

                // Try to fetch everything from beginning
                const recoveredResult = await fetchRemoteEvents(0);
                const recoveredEvents = recoveredResult.events;

                if (recoveredEvents.length > 0) {
                    console.log(`[Hydration] Recovered ${recoveredEvents.length} events from server. Rebuilding state...`);
                    await addEvents(recoveredEvents);

                    // Re-fetch state now that DB is populated
                    const newState = await getAppState();
                    await doHydrate(newState);
                    return;
                } else {
                    console.log('[Hydration] Server is also empty. Keeping local data safe (no hydration).');
                    return;
                }
            } catch (e) {
                console.error('[Hydration] Recovery failed', e);
                return;
            }
        }

        console.log('[Hydration] Sync state is empty. Skipping UI update to prevent data loss.');
        return;
    }

    await doHydrate(state);
}

async function doHydrate(state: Awaited<ReturnType<typeof getAppState>>) {
    const syncAccountCount = Object.keys(state.accounts).length;
    const syncTrxCount = Object.keys(state.transactions).length;

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

    // 5. Restore Asserts
    const assertStore = useAssertStore();
    assertStore.$state.asserts = Object.values(state.asserts);

    console.log(`UI updated: ${syncAccountCount} accounts, ${syncTrxCount} transactions.`);
}
