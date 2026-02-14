```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTransactionStore } from '~/store/transaction';
import { useCategoryStore, getFullCategoryName } from '~/store/category';
import { useAccountStore } from '~/store/account';
import { useExchangeRateStore } from '~/store/exchangeRates';
import { isTransferByCategory } from '~/store/transaction.model';
import TransactionsList from '~/components/transactions/TransactionsList.vue';
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
    type?: 'all' | 'income' | 'expense';
    excludeTransfers?: boolean;
    projects?: string[];
  };
}>();

const transactionStore = useTransactionStore();
const categoryStore = useCategoryStore();
const accountStore = useAccountStore();
const exchangeRateStore = useExchangeRateStore();

// State for Drill Down
const rootCategory = ref<string | null>(null);

// Reset root category when global category filters change
watch(() => props.filters.categories, () => {
  rootCategory.value = null;
});

// Computed Filters for Queries
const activeType = computed(() => props.filters.type || 'expense'); // Default to expense
const activeExcludeTransfers = computed(() => props.filters.excludeTransfers || false);

// Aggregation Logic
const categoryData = computed(() => {
  const { startDate, endDate, accounts, categories: selectedCategories, currency: targetCurrency } = props.filters;
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const currentRoot = rootCategory.value;

  // Filter Transactions
  const relevantTransactions = transactionStore.transactions.filter(tx => {
    // Account Filter
    if (accounts.length > 0 && !accounts.includes(tx.accountId)) return false;

    // Date Filter
    const date = dayjs(tx.date);
    if (!date.isSameOrAfter(start) || !date.isSameOrBefore(end)) return false;

    // Type Filter
    if (activeType.value === 'expense' && tx.amount >= 0) return false;
    if (activeType.value === 'income' && tx.amount <= 0) return false;

    // Exclude Transfers
    if (activeExcludeTransfers.value && isTransferByCategory(tx)) return false;

    // Global Category Filter (Selected in ReportFilters)
    // If selectedCategories is set, we only show transactions that belong to them.
    if (selectedCategories.length > 0) {
      if (!tx.category) return false;
      const matches = selectedCategories.some(cat => tx.category === cat || tx.category!.startsWith(cat + ':'));
      if (!matches) return false;
    }

    // Drill Down Filter (Current Root)
    if (currentRoot) {
      if (!tx.category) return false;
      // Must be a child of currentRoot (or self)
      const matchesRoot = tx.category === currentRoot || tx.category.startsWith(currentRoot + ':');
      if (!matchesRoot) return false;
    }

    return true;
  });

  const categoryMap = new Map<string, number>();
  let totalAmount = 0;

  for (const tx of relevantTransactions) {
    let groupName = 'Uncategorized';

    // Determine Group Name for aggregation
    if (tx.category) {
      if (currentRoot) {
        // We are inside a category. Group by immediate subcategory of currentRoot.
        if (tx.category === currentRoot) {
          groupName = currentRoot; // Group transactions directly under the current root
        } else if (tx.category.startsWith(currentRoot + ':')) {
          const rest = tx.category.slice(currentRoot.length + 1);
          const nextColon = rest.indexOf(':');
          const sub = nextColon === -1 ? rest : rest.slice(0, nextColon);
          groupName = `${currentRoot}:${sub}`;
        } else {
          // This case should ideally not be reached if the filter logic above is correct
          // but as a safeguard, if it's not a child of currentRoot, skip or categorize as uncategorized
          continue;
        }
      } else {
        // Top Level grouping (no drill-down active)
        // Group by the top-level segment of the category path
        groupName = tx.category.split(':')[0]!;
      }
    }

    // Convert Amount
    const acc = accountStore.getById(tx.accountId);
    const originalAmount = Math.abs(tx.amount); // Always positive for chart visualization
    const amount = acc ? exchangeRateStore.convert(originalAmount, acc.currency!, targetCurrency) : originalAmount;

    categoryMap.set(groupName, (categoryMap.get(groupName) || 0) + amount);
    totalAmount += amount;
  }

  // Convert map to array
  const data = Array.from(categoryMap.entries()).map(([name, value]) => {
    // Find color from store
    const catObj = categoryStore.getByName(name);

    // Determine display name for chart/table
    let displayName = getFullCategoryName({ category: name });
    if (currentRoot && name === currentRoot) {
      displayName = '(Self)'; // For transactions directly under the root, not its subcategories
    } else if (currentRoot && name.startsWith(currentRoot + ':')) {
      displayName = getFullCategoryName({ category: name.slice(currentRoot.length + 1) });
    }

    return {
      fullName: name, // Store full name for drill-down logic
      name: displayName, // Display name for UI
      value,
      percentage: totalAmount > 0 ? (value / totalAmount) * 100 : 0,
      color: catObj?.color // Optional, might use chart palette
    };
  });

  // Sort by Value Descending
  data.sort((a, b) => b.value - a.value);

  return { data, totalAmount };
});

const series = computed(() => categoryData.value.data.map(d => d.value));
const labels = computed(() => categoryData.value.data.map(d => d.name));

// Colors
const colors = computed(() => {
  return categoryData.value.data.map((d, index) => {
    if (d.color && d.color !== 'transparent') return d.color;
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
    animations: { enabled: true },
    events: {
      dataPointSelection: (event: any, chartContext: any, config: any) => {
        const index = config.dataPointIndex;
        const item = categoryData.value.data[index];
        if (item && item.fullName !== rootCategory.value) { // Prevent drilling into "Self" or same category
          rootCategory.value = item.fullName;
        }
      }
    }
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
              const total = categoryData.value.totalAmount;
              return new Intl.NumberFormat('en-US', { style: 'currency', currency: props.filters.currency, notation: "compact" }).format(total);
            }
          }
        }
      }
    }
  },
  legend: { show: false },
  tooltip: {
    enabled: true,
    y: {
      formatter: (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: props.filters.currency }).format(value);
      }
    }
  },
  dataLabels: { enabled: false },
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
    name: d.fullName, // Full name for drill-down logic
    displayName: d.name, // Display name for UI
    percentage: d.percentage.toFixed(1) + '%',
    value: d.value,
    formattedValue: new Intl.NumberFormat('en-US', { style: 'currency', currency: props.filters.currency }).format(d.value)
  }));
});

// Transaction List Filter
const transactionListFilter = computed(() => {
  // If rootCategory is set, filter by it.
  // If rootCategory is null, and global categories are selected, filter by them.
  // If neither, then no category filter (TransactionsList will show all).
  let categoryFilter: string | undefined = undefined;
  const includeSubcategories = true;

  if (rootCategory.value) {
    categoryFilter = rootCategory.value;
  } else if (props.filters.categories.length > 0) {
    // If multiple global categories are selected, TransactionsList's single categoryId filter won't work.
    // For now, we'll pass the first one, or none if multiple.
    // A more robust solution would require TransactionsList to accept an array of categories.
    if (props.filters.categories.length === 1) {
      categoryFilter = props.filters.categories[0];
    } else {
      // If multiple global categories, we can't filter the list accurately with current TransactionFilter.
      // So, we don't apply a category filter here, and the list will show all transactions
      // matching other criteria (date, accounts, type, transfers).
      // This means the list might show more transactions than aggregated in the chart.
      // This is a known limitation until TransactionFilter is updated.
      categoryFilter = undefined;
    }
  }

  return {
    // Assuming TransactionFilter will be updated to support `accounts: string[]`
    // For now, if multiple accounts, we pass undefined and rely on TransactionsList to show all.
    // If only one account, we pass it.
    accounts: props.filters.accounts.length > 0 ? props.filters.accounts : undefined,

    categoryId: categoryFilter,
    includeSubcategories: includeSubcategories,
    excludeTransfers: activeExcludeTransfers.value,
    type: activeType.value,
    startDate: props.filters.startDate,
    endDate: props.filters.endDate,
    projects: props.filters.projects?.length ? props.filters.projects : undefined,
  };
});

// Back Action
function goUp() {
  if (!rootCategory.value) return;
  const parts = rootCategory.value.split(':');
  parts.pop(); // Remove the last segment
  rootCategory.value = parts.length > 0 ? parts.join(':') : null;
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header / Nav -->
    <div v-if="rootCategory" class="flex items-center gap-2 text-sm">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" size="xs" @click="goUp">Back</UButton>
      <span class="text-gray-500">/</span>
      <span class="font-semibold">{{ getFullCategoryName({ category: rootCategory }) }}</span>
    </div>

    <!-- Chart & Table -->
    <div
      class="w-full flex flex-col md:flex-row gap-6 bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
      <!-- Chart Section -->
      <div class="w-full md:w-1/2 min-h-[300px] flex items-center justify-center">
        <ClientOnly v-if="series.length > 0">
          <apexchart width="100%" height="100%" type="donut" :options="chartOptions" :series="series" />
          <template #fallback>Loading...</template>
        </ClientOnly>
        <div v-else class="text-gray-400 text-sm">
          No data for this view
        </div>
      </div>

      <!-- Legend/Table Section -->
      <div class="w-full md:w-1/2 overflow-hidden flex flex-col">
        <h4 class="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          {{ activeType === 'all' ? 'Breakdown' : activeType + ' Breakdown' }}
        </h4>
        <div class="overflow-y-auto max-h-[300px] pr-2">
          <UTable :data="tableRows" :columns="columns" class="max-h-96 overflow-y-auto">
            <template #color-cell="{ row }">
              <span class="block w-3 h-3 rounded-full" :style="{ backgroundColor: row.original.color }"/>
            </template>
            <template #name-cell="{ row }">
              <span
class="text-gray-900 dark:text-white truncate cursor-pointer hover:underline"
                :title="row.original.name"
                @click="rootCategory = row.original.name === '(Self)' ? rootCategory : row.original.name">
                {{ row.original.displayName }}
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

    <!-- Transactions List -->
    <div>
      <h3 class="text-lg font-semibold mb-3">Transactions</h3>
      <TransactionsList :filter="transactionListFilter" />
    </div>
  </div>
</template>
```
