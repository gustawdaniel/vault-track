<template>
    <AppContainer>
        <UCard class="mt-8">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold">Daily Spending</h2>
                <UButton :to="`/account/${accountId}`" color="neutral" variant="ghost">
                    Back
                </UButton>
            </div>

            <div v-if="account">
                <p class="mb-4 text-gray-600">
                    Account: <span class="font-semibold">{{ account.name }}</span>
                </p>

                <UTable :data="dailySpending" :columns="columns">
                    <template #amount-cell="{ row }">
                        <span :class="textColorByAmount(-row.original.amount)">
                            {{ formatAmount(row.original.amount) }} {{ account.currency }}
                        </span>
                    </template>
                </UTable>
            </div>
            <div v-else>
                <p>Account not found.</p>
            </div>
        </UCard>
    </AppContainer>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAccountStore } from '~/store/account';
import { sum } from '~/store/currency';
import { useTransactionStore } from '~/store/transaction';
import { formatAmount } from '~/utils/formatAmount';
import { textColorByAmount } from '~/utils/textColorByAmount';
import AppContainer from '~/components/shared/AppContainer.vue';
import dayjs from 'dayjs';

const route = useRoute();
const accountId = String(route.params.id);

const accountStore = useAccountStore();
const transactionStore = useTransactionStore();

const account = computed(() => accountStore.getById(accountId));

const dailySpending = computed(() => {
    const transactions = transactionStore.getAllByAccountId(accountId);
    const grouped: Record<string, number> = {};

    for (const tx of transactions) {
        // Check if it's an expense (amount < 0)
        // "Daily Sending" -> Outwflow.
        if (tx.amount < 0) {
            // Use YYYY-MM-DD for grouping
            const date = dayjs(tx.date).format('YYYY-MM-DD');
            // Sum the absolute amount (to show how much was sent/spent)
            // grouped[date] = (grouped[date] || 0) + Math.abs(tx.amount);
            grouped[date] = sum(grouped[date] || 0, Math.abs(tx.amount), account.value?.currency ?? 'USD');
        }
    }

    return Object.entries(grouped)
        .map(([date, amount]) => ({
            date,
            amount,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
});

const columns = [
    {
        accessorKey: 'date',
        header: 'Date',
    },
    {
        accessorKey: 'amount',
        header: 'Total Sent',
    },
];
</script>
