<script setup lang="ts">
import { computed } from 'vue';
import { useTransactionStore } from '~/store/transaction';
import { useCategoryStore } from '~/store/category';
import { useAccountStore } from '~/store/account';
import { useExchangeRateStore } from '~/store/exchangeRates';
import { getFullCategoryName } from '~/store/category';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const props = defineProps<{
  filters: {
    startDate: string;
    endDate: string;
    accounts: string[];
    categories: string[];
    currency: string;
  };
}>();

const transactionStore = useTransactionStore();
const categoryStore = useCategoryStore();
const accountStore = useAccountStore();
const exchangeRateStore = useExchangeRateStore();

// Aggregation Logic
const categoryData = computed(() => {
  const { startDate, endDate, accounts, categories: selectedCategories, currency: targetCurrency } = props.filters;
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  // Filter Transactions: Expenses only (amount < 0), within date range, accounts, and selected categories
  const relevantTransactions = transactionStore.transactions.filter(tx => {
    if (tx.amount >= 0) return false; // Expenses only
    if (accounts.length > 0 && !accounts.includes(tx.accountId)) return false;
    
    if (selectedCategories.length > 0) {
        if (!tx.category || !selectedCategories.includes(tx.category)) return false;
    }

    const date = dayjs(tx.date);
    return date.isSameOrAfter(start) && date.isSameOrBefore(end);
  });

  const categoryMap = new Map<string, number>();
  let totalExpenses = 0;

  for (const tx of relevantTransactions) {
    const cat = tx.category || 'Uncategorized';
    // We assume amount is negative, convert to positive for chart
    // Convert logic
    const acc = accountStore.getById(tx.accountId);
    const originalAmount = Math.abs(tx.amount);
    const amount = acc ? exchangeRateStore.convert(originalAmount, acc.currency!, targetCurrency) : originalAmount;

    categoryMap.set(cat, (categoryMap.get(cat) || 0) + amount);
    totalExpenses += amount;
  }

  // Convert map to array
  const data = Array.from(categoryMap.entries()).map(([name, value]) => {
    // Find color from store
    const catObj = categoryStore.categories.find(c => c.category === name);
    
    return {
      name,
      value,
      percentage: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0,
      color: catObj?.color // Optional, might use chart palette
    };
  });

  // Sort by Value Descending
  data.sort((a, b) => b.value - a.value);

  return { data, totalExpenses };
});

const series = computed(() => categoryData.value.data.map(d => d.value));
const labels = computed(() => categoryData.value.data.map(d => getFullCategoryName({ category: d.name })));

// Custom Palette logic or just use theme?
// To ensure legend table matches chart, we should ideally define colors.
// ApexCharts generates colors if not provided. 
// Let's use a standard palette for consistent UI.
const colors = computed(() => {
    // If we have stored colors, use them, otherwise fallback to a palette
    // But ApexCharts needs a list of strings.
    // Since we sorted data, we can map data -> color.
    // If `d.color` exists, use it. Else...
    // The issue is mixing defined colors and auto colors. 
    // Let's rely on a predefined palette for modern look (e.g., Tailwind colors or specific set)
    // UNLESS the category has a specific user-defined color in store (VaultTrack has colors!).
    return categoryData.value.data.map((d, index) => {
        if (d.color && d.color !== 'transparent') return d.color;
        // Fallback palette
        const palette = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
            '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#d946ef'
        ];
        return palette[index % palette.length];
    });
});

const chartOptions = computed(() => ({
  chart: {
    type: 'donut',
    animations: { enabled: true }
  },
  labels: labels.value,
  colors: colors.value,
  plotOptions: {
    pie: {
      donut: {
        size: '55%',
        labels: {
            show: true,
            total: {
                show: true,
                showAlways: true,
                label: 'Total',
                formatter: function (w: any) {
                    const total = categoryData.value.totalExpenses;
                     return new Intl.NumberFormat('en-US', { style: 'currency', currency: props.filters.currency, notation: "compact" }).format(total);
                }
            }
        }
      }
    }
  },
  legend: { show: false }, // We build our own
  tooltip: {
    enabled: true,
    y: {
      formatter: (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: props.filters.currency }).format(value);
      }
    }
  },
  dataLabels: { enabled: false }, // Clean look
  stroke: { show: false }
}));

// Table columns
const columns = [
  { key: 'color', id: 'color', label: ' ' },
  { key: 'name', id: 'name', label: 'Category' },
  { key: 'percentage', id: 'percentage', label: '%' },
  { key: 'value', id: 'value', label: 'Amount' }
] as any[];

const tableRows = computed(() => {
    return categoryData.value.data.map((d, index) => ({
        color: colors.value[index],
        name: d.name,
        percentage: d.percentage.toFixed(1) + '%',
        value: d.value, 
        formattedValue: new Intl.NumberFormat('en-US', { style: 'currency', currency: props.filters.currency }).format(d.value)
    }));
});
</script>

<template>
  <div class="w-full flex flex-col md:flex-row gap-6 bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
    <!-- Chart Section -->
    <div class="w-full md:w-1/2 min-h-[300px] flex items-center justify-center">
       <ClientOnly v-if="series.length > 0">
        <apexchart 
          width="100%" 
          height="100%" 
          type="donut"
          :options="chartOptions" 
          :series="series"
        />
        <template #fallback>Loading...</template>
      </ClientOnly>
      <div v-else class="text-gray-400 text-sm">
        No expense data for this period
      </div>
    </div>

    <!-- Legend/Table Section -->
    <div class="w-full md:w-1/2 overflow-hidden flex flex-col">
       <h4 class="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Expense Breakdown</h4>
       <div class="overflow-y-auto max-h-[300px] pr-2">
            <UTable 
              :data="tableRows" 
              :columns="columns"
              class="max-h-96 overflow-y-auto"
            >
                <template #color-cell="{ row }">
                     <span class="block w-3 h-3 rounded-full" :style="{ backgroundColor: row.original.color }"></span>
                </template>
                <template #name-cell="{ row }">
                   <span class="text-gray-900 dark:text-white truncate" :title="row.original.name">
                       {{ getFullCategoryName({category: row.original.name}) }}
                   </span>
                </template>
                <template #value-cell="{ row }">
                    <div class="text-right font-medium">
                        {{ row.original.formattedValue }}
                    </div>
                </template>
                <template #percentage-cell="{ row }">
                    <div class="text-right text-gray-500">
                        {{ row.original.percentage }}
                    </div>
                </template>
            </UTable>
       </div>
    </div>
  </div>
</template>
