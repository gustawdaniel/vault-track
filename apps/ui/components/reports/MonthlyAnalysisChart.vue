<script setup lang="ts">
import { computed } from 'vue';
import { useTransactionStore } from '~/store/transaction';
import { useAccountStore } from '~/store/account';
import { useExchangeRateStore } from '~/store/exchangeRates';
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
    currency: string;
  };
}>();

const transactionStore = useTransactionStore();
const accountStore = useAccountStore();
const exchangeRateStore = useExchangeRateStore();

// Aggregation Logic
const monthlyData = computed(() => {
  const { startDate, endDate, accounts, currency: targetCurrency } = props.filters;
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  const relevantTransactions = transactionStore.transactions.filter(tx => {
    if (accounts.length > 0 && !accounts.includes(tx.accountId)) return false;
    const date = dayjs(tx.date);
    return date.isSameOrAfter(start) && date.isSameOrBefore(end);
  });

  // Map: 'YYYY-MM' -> Balance
  const monthlyBalances = new Map<string, number>();
  
  // Initialize all months in range with 0
  let currentMonth = start.startOf('month');
  while (currentMonth.isSameOrBefore(end)) {
    monthlyBalances.set(currentMonth.format('YYYY-MM'), 0);
    currentMonth = currentMonth.add(1, 'month');
  }

  for (const tx of relevantTransactions) {
    const monthKey = dayjs(tx.date).format('YYYY-MM');
    if (monthlyBalances.has(monthKey)) {
        const acc = accountStore.getById(tx.accountId);
        const amount = acc ? exchangeRateStore.convert(tx.amount, acc.currency!, targetCurrency) : tx.amount;
        monthlyBalances.set(monthKey, (monthlyBalances.get(monthKey) || 0) + amount);
    }
  }

  const data: { x: string; y: number }[] = [];
  let totalBalance = 0;
  let count = 0;

  for (const [month, balance] of monthlyBalances.entries()) {
    data.push({ x: month, y: parseFloat(balance.toFixed(2)) });
    totalBalance += balance;
    count++;
  }

  const average = count > 0 ? totalBalance / count : 0;

  // Sort by date just in case
  data.sort((a, b) => a.x.localeCompare(b.x));

  return { data, average };
});

const series = computed(() => {
  return [{
      name: 'Monthly Balance',
      data: monthlyData.value.data
  }];
});

const chartOptions = computed(() => {
  const average = monthlyData.value.average;
  
  return {
    chart: {
      id: 'monthly-analysis-chart',
      type: 'bar',
      toolbar: { show: false },
      animations: { enabled: true }
    },
    plotOptions: {
      bar: {
        colors: {
          ranges: [
            { from: -Infinity, to: -0.01, color: '#ef4444' }, // Red-500
            { from: 0, to: Infinity, color: '#10b981' }       // Emerald-500
          ]
        },
        columnWidth: '60%',
        borderRadius: 2
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'category', // Using 'category' for formatted month strings
      labels: {
        formatter: (val: string) => dayjs(val).format('MMM YYYY')
      }
    },
    yaxis: {
      labels: {
        formatter: (value: number) => {
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: props.filters.currency, notation: "compact" }).format(value);
        }
      }
    },
    grid: {
      show: true,
      borderColor: '#f3f4f6',
      strokeDashArray: 0,
       yaxis: {
        lines: { show: true } 
      }, 
      xaxis: {
        lines: { show: false }
      }
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (value: number) => {
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: props.filters.currency }).format(value);
        }
      }
    },
    annotations: {
      yaxis: [
        {
          y: average,
          borderColor: '#3b82f6', // Blue-500
          strokeDashArray: 4,
          label: {
            borderColor: '#3b82f6',
            style: {
              color: '#fff',
              background: '#3b82f6'
            },
            text: `Avg: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: props.filters.currency, notation: "compact" }).format(average)}`
          }
        },
        {
           y: 0,
           borderColor: '#9ca3af', // Gray-400
           strokeDashArray: 0,
           opacity: 0.5
        }
      ]
    }
  };
});
</script>

<template>
  <div class="w-full h-80 bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
    <ClientOnly>
      <apexchart 
        width="100%" 
        height="100%" 
        type="bar"
        :options="chartOptions" 
        :series="series"
      />
      <template #fallback>
        <div class="flex items-center justify-center h-full text-gray-400">
          Loading Data...
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
