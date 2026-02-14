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

    // We need to check all accounts with assertions
    for (const account of accountStore.accounts) {
        const accountAsserts = assertStore.getByAccountId(account.id);
        if (accountAsserts.length === 0) continue;

        // Get transactions for this account
        // Optimization: We could cache this or be smarter?
        // But for "Health Check" we probably want accuracy.
        // prepareTransactionsToDisplay is heavy? It calculates balances.
        // We need balances.

        const transactions = prepareTransactionsToDisplay(
            transactionStore.transactions,
            { accountId: account.id }
        );

        // Sort transactions - prepareTransactionsToDisplay already sorts by date
        // Reverse for our logic? logic in TransactionsList uses descending.
        const txs = [...transactions].reverse();
        const sortedAsserts = [...accountAsserts].sort((a, b) => b.date.localeCompare(a.date));

        let txIndex = 0;
        let assertIndex = 0;

        while (txIndex < txs.length || assertIndex < sortedAsserts.length) {
            const tx = txs[txIndex];
            const assert = sortedAsserts[assertIndex];
            const currentBalance = txs[txIndex]?.accountSubBalance ?? 0;

            if (!assert) {
                txIndex++;
            } else if (!tx) {
                // Assert older than all transactions. Balance 0.
                const actual = 0;
                const diff = actual - assert.value;
                if (Math.abs(diff) >= 0.005) {
                    failures.push({
                        id: assert.id,
                        accountName: account.name,
                        accountId: account.id,
                        date: assert.date,
                        expected: assert.value,
                        actual,
                        diff
                    });
                }
                assertIndex++;
            } else {
                const txDateDay = (tx.date || '').split('T')[0];
                if (txDateDay > assert.date) {
                    txIndex++;
                } else {
                    // Assert check
                    const actual = currentBalance;
                    const diff = actual - assert.value;
                    if (Math.abs(diff) >= 0.005) {
                        failures.push({
                            id: assert.id,
                            accountName: account.name,
                            accountId: account.id,
                            date: assert.date,
                            expected: assert.value,
                            actual,
                            diff
                        });
                    }
                    assertIndex++;
                }
            }
        }
    }
    return failures;
});

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
