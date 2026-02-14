<script setup lang="ts">
import { onMounted, h, computed } from 'vue';
import { useExchangeRateStore } from '~/store/exchangeRates';

const exchangeRateStore = useExchangeRateStore();

onMounted(() => {
    if (!exchangeRateStore.ratesData.date || exchangeRateStore.ratesData.date !== new Date().toISOString().split('T')[0]) {
        exchangeRateStore.fetchRates();
    }
});

const columns = [
  {
    accessorKey: 'currency',
    header: 'Currency',
    cell: ({ row }: any) => {
        return h('span', { class: 'font-medium' }, row.original.currency)
    }
  },
  {
    accessorKey: 'rate',
    header: 'Rate (Units per USD)',
    cell: ({ row }: any) => {
      const val = row.original.rate;
      if (val < 0.001) {
          // Scientific for very small numbers
          return val.toExponential(4);
      }
      return new Intl.NumberFormat('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 6 
      }).format(val);
    }
  },
  {
    id: 'price',
    header: 'Price (USD)',
    cell: ({ row }: any) => {
        const rate = row.original.rate;
        if (!rate) return '-';
        const price = 1 / rate;
        
        // Dynamic precision for price
        // BTC ~ 96000 -> 2 decimals
        // DOGE ~ 0.10 -> 4 decimals?
        // PEPE ~ 0.000001 -> more decimals
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: price < 1 ? 6 : 2,
            maximumFractionDigits: price < 1 ? 8 : 2
        }).format(price);
    }
  },
  {
    accessorKey: 'date',
    header: 'Date',
      cell: ({ row }: any) => {
          return row.original.date
      }
  },
];

const rows = computed(() => {
    const rates = exchangeRateStore.ratesData?.rates;
    if (!rates) return [];
    
    return Object.entries(rates).map(([curr, rate]) => ({
        currency: curr,
        rate: typeof rate === 'number' ? rate : parseFloat(rate), // Ensure rate is a number for calculations
        date: exchangeRateStore.ratesData?.date // Add date to row data
    })).sort((a, b) => a.currency.localeCompare(b.currency));
});

// Debug
const debugData = computed(() => JSON.stringify(exchangeRateStore.ratesData, null, 2));
</script>

<template>
  <ClientOnly>
    <UCard>
        <template #header>
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium">Exchange Rates</h3>
            <UButton 
                icon="i-heroicons-arrow-path" 
                variant="ghost" 
                :loading="exchangeRateStore.loading"
                @click="exchangeRateStore.fetchRates('USD')"
            />
        </div>
        </template>

        <div class="max-h-60 overflow-y-auto">
            <UTable 
                :columns="columns" 
                :data="rows"
                :loading="exchangeRateStore.loading"
            />
            <pre v-if="false">{{ debugData }}</pre>
        </div>
        <template #footer>
            <p class="text-xs text-gray-500">
                Base: {{ exchangeRateStore.ratesData?.base }} • Date: {{ exchangeRateStore.ratesData?.date }}
            </p>
        </template>
    </UCard>
    <template #fallback>
        <div class="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
    </template>
  </ClientOnly>
</template>
