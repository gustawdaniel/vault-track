<script lang="ts" setup>
import { useAccountStore } from '~/store/account';
import { useTransactionStore } from '~/store/transaction';
import { useAssertStore } from '~/store/assert';
import { prepareTransactionsToDisplay, type ExtendedFullTransaction } from '~/utils/prepareTransactionsToDisplay';
import { formatAmount } from '~/utils/formatAmount';
import { getCurrencyDigits, type Currency } from '~/store/currency';
import { useDialog } from '~/store/dialog';
import SingleTransactionEdit from '~/components/transactions/SingleTransactionEdit.vue';

const accountStore = useAccountStore();
const transactionStore = useTransactionStore();
const assertStore = useAssertStore();
const dialog = useDialog();

interface FailingAssert {
    id: string;
    accountName: string;
    accountId: string;
    date: string;
    expected: number;
    actual: number;
    diff: number;
}

const failingAsserts = computed<FailingAssert[]>(() => {
    const failures: FailingAssert[] = [];

    // Optimization: Single pass over transactions to calculate balances for ALL accounts
    // Map<AccountId, { date: string, balance: number }[]>
    // Since we need running balances at specific dates, this is still tricky.
    // However, prepareTransactionsToDisplay calculates running balances.
    // We can just iterate assertions and check against the transaction at that date.
    
    // Better approach:
    // 1. Get all assertions, group by account.
    // 2. Iterate transactions ONCE (they are sorted by date usually, or we sort them).
    // ... Actually, prepareTransactionsToDisplay is heavy because it adds colors, formats currency etc.
    // We only need raw amounts and dates.

    const accountsWithAsserts = new Set(assertStore.asserts.map(a => a.accountId));
    if (accountsWithAsserts.size === 0) return [];

    // Get all transactions for relevant accounts
    const relevantTxs = transactionStore.transactions.filter(t => accountsWithAsserts.has(t.accountId));
    
    // Sort transactions by date ASC (oldest first) to calculate running balance
    // Note: transactionStore.transactions might not be sorted perfectly if modified.
    relevantTxs.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate running balances per account
    // Map<AccountId, { date: string, balance: number }[]> matches? 
    // actually we just need to check asserts as we go or after.
    
    const accountBalances: Record<string, number> = {};
    const accountAsserts = new Map<string, typeof assertStore.asserts>();

    for(const assert of assertStore.asserts) {
        if(!accountAsserts.has(assert.accountId)) accountAsserts.set(assert.accountId, []);
        accountAsserts.get(assert.accountId)!.push(assert);
    }

    // Sort assertions by date ASC
    for(const list of accountAsserts.values()) {
        list.sort((a, b) => a.date.localeCompare(b.date));
    }

    // Pointers for assertions
    const assertPointers: Record<string, number> = {};

    // Helper to check assert
    const checkAssert = (assert: typeof assertStore.asserts[0], currentBalance: number) => {
        const diff = currentBalance - assert.value;
        if (Math.abs(diff) >= 0.005) {
             const account = accountStore.getById(assert.accountId);
             if (!account) return;
             
             failures.push({
                id: assert.id,
                accountName: account.name,
                accountId: account.id,
                date: assert.date,
                expected: assert.value,
                actual: currentBalance,
                diff
            });
        }
    };

    // Iterate transactions
    for (const tx of relevantTxs) {
        const accId = tx.accountId;
        // Initialize balance if needed
        if (accountBalances[accId] === undefined) accountBalances[accId] = 0;

        const currentBalance = accountBalances[accId];
        const txDateDay = (tx.date || '').split('T')[0];
        if (!txDateDay) continue; // Should not happen for valid transactions

        // Check if we passed any asserts for this account (Assert Date < Tx Date)
        // If Assert Date == Tx Date, the assert happens BEFORE the transaction in our logic?
        // Wait, standard accounting: Assert is usually "Balance at end of day" or similar.
        // In previous logic: 
        // if (txDateDay > assert.date) -> Assert is older. Check it against balance BEFORE this tx.
        // if (txDateDay <= assert.date) -> Assert is newer/same. Process tx first.
        
        const asserts = accountAsserts.get(accId);
        if (asserts) {
            let ptr = assertPointers[accId] || 0;
            while(ptr < asserts.length) {
                const assert = asserts[ptr];
                if (!assert) { ptr++; continue; } // Safety check

                if (assert.date < txDateDay) {
                    // Assert date is in the past compared to current tx. 
                    // Verify against Current Balance (which does NOT include current tx yet)
                    checkAssert(assert, currentBalance);
                    ptr++;
                } else {
                    break; 
                }
            }
            assertPointers[accId] = ptr;
        }

        // Apply transaction
        accountBalances[accId] = currentBalance + tx.amount;
    }

    // Check remaining asserts (dates after last transaction) for each account
    for (const [accId, asserts] of accountAsserts) {
        let ptr = assertPointers[accId] || 0;
        const currentBalance = accountBalances[accId] || 0;
        while(ptr < asserts.length) {
             const assert = asserts[ptr];
             if (assert) {
                 // All these asserts are after the last transaction (or no transactions existed)
                 // So they should match the final balance
                 checkAssert(assert, currentBalance);
             }
             ptr++;
        }
    }
    
    return failures;
}); 

// Helper to get new transaction (hoisted or imported?)
// reusing existing imports
function getNewTransaction(accountId: string) {
    const tx = transactionStore.getNew();
    tx.accountId = accountId;
    return tx;
}

function handleFix(item: FailingAssert) {
    const tx = transactionStore.getNew();
    tx.accountId = item.accountId;
    // We need account name for display? transactionStore.getNew() might not set it.
    // SingleTransactionEdit uses accountId to find account.

    tx.date = item.date;
    const account = accountStore.getById(item.accountId);
    const precision = getCurrencyDigits((account?.currency || 'USD') as Currency);
    tx.amount = Number((-(item.diff)).toFixed(precision));
    tx.payee = 'Reconciliation Balance Adjustment';
    tx.memo = `Fixing assert mismatch. Expected ${formatAmount(item.expected)}, Actual ${formatAmount(item.actual)}`;

    dialog.openDialog(SingleTransactionEdit, {
        transaction: tx,
        onExit: () => dialog.closeDialog()
    });
}
</script>

<template>
    <div v-if="failingAsserts.length > 0" class="mb-6">
        <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
            <div class="flex">
                <div class="flex-shrink-0">
                    <UIcon name="i-heroicons-x-circle" class="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div class="ml-3 w-full">
                    <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Reconciliation Alerts</h3>
                    <div class="mt-2 text-sm text-red-700 dark:text-red-300">
                        <p>Found {{ failingAsserts.length }} assertions with discrepancies.</p>

                        <ul role="list" class="mt-2 space-y-1 pl-5 list-disc">
                            <li v-for="fail in failingAsserts" :key="fail.id"
                                class="flex justify-between items-center gap-4">
                                <span>
                                    <strong>{{ fail.accountName }}</strong> on {{ fail.date }}:
                                    Expected {{ formatAmount(fail.expected) }},
                                    Actual {{ formatAmount(fail.actual) }}
                                </span>
                                <div class="flex gap-2">
                                    <UButton size="xs" color="neutral" variant="soft"
                                        :to="`/account/${fail.accountId}#${fail.id}`">See</UButton>
                                    <UButton size="xs" color="error" variant="soft" @click="handleFix(fail)">Fix
                                    </UButton>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
