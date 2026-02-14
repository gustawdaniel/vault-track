<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTransactionStore } from '~/store/transaction';
import { useCategoryStore } from '~/store/category';
import type { PersistedCategory } from '~/store/category';
import SingleCategoryEdit from '~/components/category/SingleCategoryEdit.vue';
import TransactionsList from '~/components/transactions/TransactionsList.vue';
import { isTransferByCategory } from '~/store/transaction.model';

const props = defineProps<{ category: PersistedCategory }>();

const router = useRouter();
const transactionStore = useTransactionStore();
const categoryStore = useCategoryStore();

const isEditing = ref(false);
const excludeTransfers = ref(false); // Default false as per requirement "able to exclude", imply optional
const typeFilter = ref<'all' | 'expense' | 'income'>('expense'); // Default to expense as it's most common for categories

const transactionFilter = computed(() => ({
    categoryId: props.category.category,
    includeSubcategories: true,
    excludeTransfers: excludeTransfers.value,
    type: typeFilter.value,
}));

// Chart Data Preparation
const categoryGroups = computed(() => {
    const rootName = props.category.category;
    const groups = new Map<string, number>();

    // Get relevant transactions for chart aggregation
    // We reuse the filter logic but maybe we want to do it here manually for aggregation
    // or rely on a helper.
    // Let's filter manually to ensure we get the aggregation right.

    const relevantTransactions = transactionStore.transactions.filter(t => {
        // Category Check (Prefix)
        if (!t.category) return false;
        const matches = t.category === rootName || t.category.startsWith(rootName + ':');
        if (!matches) return false;

        // Exclude Transfers
        if (excludeTransfers.value && isTransferByCategory(t)) return false;

        // Type Filter
        if (typeFilter.value === 'expense' && t.amount >= 0) return false;
        if (typeFilter.value === 'income' && t.amount <= 0) return false;

        return true;
    });

    relevantTransactions.forEach(t => {
        let groupName = rootName; // Default to self (the root category itself)

        // Determine immediate subcategory
        if (t.category!.length > rootName.length && t.category![rootName.length] === ':') {
            const rest = t.category!.slice(rootName.length + 1);
            const nextColon = rest.indexOf(':');
            const immediateSub = nextColon === -1 ? rest : rest.slice(0, nextColon);
            groupName = rootName + ':' + immediateSub;
        }

        // Sum absolute amount
        groups.set(groupName, (groups.get(groupName) || 0) + Math.abs(t.amount));
    });

    // Convert to array and sort
    return Array.from(groups.entries())
        .map(([fullName, value]) => {
            const relativeName = fullName === rootName ? '(Self)' : fullName.slice(rootName.length + 1);
            const categoryObj = categoryStore.getByName(fullName);
            return {
                fullName,
                name: relativeName,
                value,
                color: categoryObj?.color
            };
        })
        .sort((a, b) => b.value - a.value);
});

const chartSeries = computed(() => categoryGroups.value.map(g => g.value));
const chartLabels = computed(() => categoryGroups.value.map(g => g.name));
const chartColors = computed(() => {
    // Generate colors if missing
    return categoryGroups.value.map((g, i) => {
        if (g.color && g.color !== 'transparent') return g.color;
        const palette = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
        return palette[i % palette.length];
    });
});

const chartOptions = computed(() => ({
    chart: {
        type: 'donut',
        events: {
            dataPointSelection: (event: any, chartContext: any, config: any) => {
                const index = config.dataPointIndex;
                const group = categoryGroups.value[index];
                if (group && group.fullName !== props.category.category) {
                    // Navigate to subcategory
                    const catObj = categoryStore.getByName(group.fullName);
                    if (catObj) {
                        router.push(`/category/${catObj.id}`);
                    }
                }
            }
        }
    },
    labels: chartLabels.value,
    colors: chartColors.value,
    plotOptions: {
        pie: {
            donut: {
                size: '55%',
                labels: {
                    show: true, total: {
                        show: true, showAlways: true, label: 'Total', formatter: (w: any) => {
                            const total = categoryGroups.value.reduce((acc, curr) => acc + curr.value, 0);
                            return total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                    }
                }
            }
        }
    },
    legend: { position: 'bottom' },
    dataLabels: { enabled: false }
}));

const typeOptions = [
    { label: 'All', value: 'all' },
    { label: 'Expense', value: 'expense' },
    { label: 'Income', value: 'income' }
];
</script>

<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
            <div>
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <div :style="{ backgroundColor: category.color }" class="w-4 h-4 rounded-full"/>
                    {{ category.category }}
                </h1>
                <p class="text-sm text-gray-500 mt-1">Managed transactions and subcategories</p>
            </div>
            <div class="flex items-center gap-2">
                <USelectMenu
v-model="typeFilter" :options="typeOptions" value-attribute="value"
                    option-attribute="label" class="w-32" />
                <UCheckbox v-model="excludeTransfers" label="Exclude Transfers" />
                <UButton
:icon="isEditing ? 'i-heroicons-x-mark' : 'i-heroicons-pencil'" variant="ghost"
                    color="neutral" @click="isEditing = !isEditing">
                    {{ isEditing ? 'Cancel' : 'Edit' }}
                </UButton>
            </div>
        </div>

        <!-- Edit Mode -->
        <div v-if="isEditing">
            <UCard>
                <SingleCategoryEdit :category="category" />
            </UCard>
        </div>

        <!-- Dashboard Mode -->
        <div v-else class="space-y-6">
            <!-- Chart -->
            <UCard v-if="categoryGroups.length > 0">
                <div class="h-80 w-full">
                    <ClientOnly>
                        <apexchart
width="100%" height="100%" type="donut" :options="chartOptions"
                            :series="chartSeries" />
                    </ClientOnly>
                </div>
            </UCard>

            <!-- List -->
            <div>
                <h2 class="text-xl font-semibold mb-3">Transactions</h2>
                <TransactionsList :filter="transactionFilter" />
            </div>
        </div>
    </div>
</template>
