<script setup lang="ts">
import ReportFilters from '~/components/reports/ReportFilters.vue';
import ExchangeRatesViewer from '~/components/settings/ExchangeRatesViewer.vue';

const title = 'Reports';
useHead({
  title,
});

const generatedFilters = ref<any>(null);
const loading = ref(false);

function handleGenerate(filters: any) {
  loading.value = true;
  // Simulate API call or data processing
  setTimeout(() => {
    generatedFilters.value = filters;
    loading.value = false;
  }, 500);
}
</script>

<template>
  <UContainer class="py-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ title }}</h1>
    </div>

    <!-- Filters -->
    <ReportFilters :loading="loading" @generate="handleGenerate" />

    <!-- Chart Placeholder -->
    <UCard v-if="generatedFilters" class="mt-4">
      <template #header>
        <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
          {{
            generatedFilters.reportType === 'cashflow' ? 'Cash Flow Forecast' :
              generatedFilters.reportType === 'monthly' ? 'Monthly Analysis' :
                'Categories Breakdown'
          }}
        </h3>
      </template>

      <div v-if="generatedFilters.reportType === 'cashflow'" class="bg-white dark:bg-gray-900 rounded-lg p-2">
        <ReportsCashFlowChart :filters="generatedFilters" />
      </div>

      <div v-else-if="generatedFilters.reportType === 'monthly'" class="bg-white dark:bg-gray-900 rounded-lg p-2">
        <ReportsMonthlyAnalysisChart :filters="generatedFilters" />
      </div>

      <div v-else-if="generatedFilters.reportType === 'categories'" class="bg-white dark:bg-gray-900 rounded-lg p-2">
        <ReportsCategorySummaryChart :filters="generatedFilters" />
      </div>

      <div
v-else
        class="h-64 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <p class="text-gray-500 font-medium">
          Chart placeholder for {{ generatedFilters.reportType }}
        </p>
        <p class="text-sm text-gray-400">
          {{ generatedFilters.startDate }} to {{ generatedFilters.endDate }}
        </p>
      </div>

      <div class="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
        <p><span class="font-medium">Selected Accounts:</span> {{ generatedFilters.accounts.length ?
          generatedFilters.accounts.join(', ') : 'All' }}</p>
        <p><span class="font-medium">Currency:</span> {{ generatedFilters.currency }}</p>
        <p><span class="font-medium">Categories:</span> {{ generatedFilters.categories.length ?
          generatedFilters.categories.length + ' selected' : 'All' }}</p>
        <p><span class="font-medium">Projects:</span> {{ generatedFilters.projects.length ?
          generatedFilters.projects.length +
          ' selected' : 'All' }}</p>
        <p><span class="font-medium">Type:</span> <span class="capitalize">{{ generatedFilters.type || 'expense'
            }}</span></p>
        <p v-if="generatedFilters.excludeTransfers" class="text-orange-600 dark:text-orange-400 font-medium">Excluding
          Transfers</p>
      </div>
    </UCard>

    <div v-else class="text-center py-10 text-gray-500">
      <UIcon name="i-heroicons-chart-bar" class="w-12 h-12 mx-auto mb-2 opacity-50" />
      <p>Configure filters and click "Generate Report" to see data.</p>
    </div>

    <UDivider class="my-8" />
    <ExchangeRatesViewer />
  </UContainer>
</template>
