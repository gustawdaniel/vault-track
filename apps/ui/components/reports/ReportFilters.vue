<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAccountStore } from '~/store/account';
import { useCategoryStore } from '~/store/category';
import { useProjectStore } from '~/store/project';
import { currencies } from '~/store/currency';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
dayjs.extend(quarterOfYear);

const props = defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits(['generate']);

// Stores
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const projectStore = useProjectStore();

// Options
const reportTypes = [
  { label: 'Cash Flow', value: 'cashflow' },
  { label: 'Monthly Analysis', value: 'monthly' },
  { label: 'Categories', value: 'categories' },
];

const dateRangeOptions = [
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'This Quarter', value: 'thisQuarter' },
  { label: 'This Year', value: 'thisYear' },
  { label: 'Custom', value: 'custom' },
];

const accountOptions = computed(() => accountStore.sortedAccounts.map(a => ({
  label: a.name,
  value: a.id,
  accountType: a.type
})));

const categoryOptions = computed(() => categoryStore.categories.map(c => ({
  label: c.category,
  value: c.category,
  color: c.color
})));

const transactionTypeOptions = [
  { label: 'All', value: 'all' },
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
];

const projectOptions = computed(() => projectStore.projects.map((p: any) => ({
  label: p.project,
  value: p.project
})));

// State
const filters = ref({
  dateRange: dateRangeOptions[0]!.value, // Default to value 'thisMonth'
  startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
  endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
  reportType: reportTypes[0]!.value,
  accounts: [] as string[], // IDs
  categories: [] as string[], // Names
  projects: [] as string[], // Names
  currency: 'USD' as any,
  type: 'expense' as 'all' | 'income' | 'expense',
  excludeTransfers: false
});

// Watchers / Logic
watch(() => filters.value.dateRange, (newRangeValue) => {
  const now = dayjs();
  if (newRangeValue === 'thisMonth') {
    filters.value.startDate = now.startOf('month').format('YYYY-MM-DD');
    filters.value.endDate = now.endOf('month').format('YYYY-MM-DD');
  } else if (newRangeValue === 'lastMonth') {
    const lastMonth = now.subtract(1, 'month');
    filters.value.startDate = lastMonth.startOf('month').format('YYYY-MM-DD');
    filters.value.endDate = lastMonth.endOf('month').format('YYYY-MM-DD');
  } else if (newRangeValue === 'thisQuarter') {
    filters.value.startDate = now.startOf('quarter').format('YYYY-MM-DD');
    filters.value.endDate = now.endOf('quarter').format('YYYY-MM-DD');
  } else if (newRangeValue === 'thisYear') {
    filters.value.startDate = now.startOf('year').format('YYYY-MM-DD');
    filters.value.endDate = now.endOf('year').format('YYYY-MM-DD');
  }
});

function onGenerate() {
  emit('generate', filters.value);
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
          Report Control
        </h3>
      </div>
    </template>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Report Type -->
      <UFormField label="Report Type">
        <USelect v-model="filters.reportType" :items="reportTypes" class="w-full" />
      </UFormField>

      <!-- Date Range Preset -->
      <UFormField label="Date Range">
        <USelect v-model="filters.dateRange" :items="dateRangeOptions" class="w-full" />
      </UFormField>

      <!-- Custom Date Inputs -->
      <template v-if="filters.dateRange === 'custom'">
        <UFormField label="Start Date">
          <UInput v-model="filters.startDate" type="date" class="w-full" />
        </UFormField>
        <UFormField label="End Date">
          <UInput v-model="filters.endDate" type="date" class="w-full" />
        </UFormField>
      </template>

      <!-- Accounts -->
      <UFormField label="Accounts">
        <USelect v-model="filters.accounts" :items="accountOptions" multiple placeholder="All Accounts"
          class="w-full" />
      </UFormField>

      <!-- Categories -->
      <UFormField label="Categories">
        <USelect v-model="filters.categories" :items="categoryOptions" multiple placeholder="All Categories"
          class="w-full" />
      </UFormField>

      <!-- Projects -->
      <UFormField label="Projects">
        <USelect v-model="filters.projects" :items="projectOptions" multiple placeholder="All Projects"
          class="w-full" />
      </UFormField>

      <!-- Currency -->
      <UFormField label="Currency">
        <USelect v-model="filters.currency" :items="currencies" class="w-full" />
      </UFormField>

      <!-- Transaction Type -->
      <UFormField label="Transaction Type">
        <USelect v-model="filters.type" :items="transactionTypeOptions" class="w-full" />
      </UFormField>

      <!-- Exclude Transfers -->
      <UFormField label="Transfers">
        <UCheckbox v-model="filters.excludeTransfers" label="Exclude Transfers" class="mt-2" />
      </UFormField>
    </div>

    <template #footer>
      <UButton block color="primary" variant="solid" label="Generate Report" :loading="loading" @click="onGenerate" />
    </template>
  </UCard>
</template>
