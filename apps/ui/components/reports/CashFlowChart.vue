<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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
    // ... other filters if needed
  };
}>();

const transactionStore = useTransactionStore();
const accountStore = useAccountStore();

// Series Data Calculation
const series = computed(() => {
  const { startDate, endDate, accounts, currency: targetCurrency } = props.filters;
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  
  // Use Exchange Store
  const exchangeRateStore = useExchangeRateStore();

  // 1. Filter Transactions
  // We need ALL transactions up to endDate to calculate balance correctly
  // Then we slice the result for the view window
  const relevantTransactions = transactionStore.transactions.filter(tx => {
    // Filter by Account
    if (accounts.length > 0 && !accounts.includes(tx.accountId)) return false;
    // Filter by Date (only UP TO end date is strictly needed for calc, but we sort later)
    return dayjs(tx.date).isSameOrBefore(end);
  });

  // 2. Sort by date ASC
  relevantTransactions.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));

  // 3. Transform to Chart Series format
  const dataPoints: { x: number; y: number }[] = [];
  
  // Calculate initial balance at StartDate
  // This sums up all transactions strictly BEFORE startDate
  let runningBalance = relevantTransactions
    .filter(tx => dayjs(tx.date).isBefore(start))
    .reduce((sum, tx) => {
        const acc = accountStore.getById(tx.accountId);
        const amount = acc ? exchangeRateStore.convert(tx.amount, acc.currency!, targetCurrency) : tx.amount;
        return sum + amount;
    }, 0); 

  // Cursor for iterating transactions efficiently
  let txCursor = 0;
  
  // Advance cursor to the first transaction on or after startDate
  while (txCursor < relevantTransactions.length) {
    const tx = relevantTransactions[txCursor];
    if (tx && dayjs(tx.date).isBefore(start)) {
      txCursor++;
    } else {
      break;
    }
  }

  // Iterate day by day from Start to End
  let currentDay = start;
  while (currentDay.isSameOrBefore(end)) {
    // Process all transactions that happen on 'currentDay'
    // Since relevantTransactions is sorted, we just check the current cursor
    while (txCursor < relevantTransactions.length) {
      const tx = relevantTransactions[txCursor];
      if (!tx) break;

      const txDate = dayjs(tx.date);
      
      if (txDate.isSame(currentDay, 'day')) {
        const acc = accountStore.getById(tx.accountId);
        const amount = acc ? exchangeRateStore.convert(tx.amount, acc.currency!, targetCurrency) : tx.amount;
        runningBalance += amount;
        txCursor++;
      } else if (txDate.isBefore(currentDay, 'day')) {
         // Safe guard
         const acc = accountStore.getById(tx.accountId);
         const amount = acc ? exchangeRateStore.convert(tx.amount, acc.currency!, targetCurrency) : tx.amount;
         runningBalance += amount;
         txCursor++;
      } else {
        // Transaction is in the future relative to currentDay
        break;
      }
    }
    
    dataPoints.push({
      x: currentDay.valueOf(), // Timestamp
      y: parseFloat(runningBalance.toFixed(2))
    });
    
    currentDay = currentDay.add(1, 'day');
  }

  return [{
    name: 'Balance',
    data: dataPoints
  }];
});

// Chart Options
const chartOptions = computed(() => {
  // Calculate Y-axis range to determine zero position for gradient
  const values = series.value[0]?.data.map(p => p.y) || [];
  const min = Math.min(...values, 0); // Ensure 0 is considered
  const max = Math.max(...values, 0);
  const range = max - min;
  
  // Calculate zero offset percentage (from top)
  let zeroOffset = 0;
  if (range === 0) {
    zeroOffset = 100; 
  } else {
    zeroOffset = ((max - 0) / range) * 100;
  }
  
  return {
    chart: {
      id: 'cash-flow-chart',
      type: 'area',
      width: '100%',
      height: '100%',
      toolbar: {
        show: true,
        tools: { download: false, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true }
      },
      animations: { enabled: true }
    },
    colors: ['#10b981'], // Emerald-500
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100]
      }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      type: 'datetime',
      tooltip: { enabled: false }
    },
    yaxis: {
      labels: {
        formatter: (value: number) => {
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: props.filters.currency }).format(value);
        }
      }
    },
    annotations: {
      yaxis: [
        {
          y: 0,
          borderColor: '#ef4444',
          label: {
            borderColor: '#ef4444',
            style: {
              color: '#fff',
              background: '#ef4444'
            },
            text: '0'
          }
        }
      ]
    },
    tooltip: {
      theme: 'dark',
      x: { format: 'dd MMM yyyy' },
      y: {
        formatter: (value: number) => {
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: props.filters.currency }).format(value);
        }
      }
    },
    grid: {
      borderColor: '#f1f1f1',
      strokeDashArray: 4
    }
  };
});
</script>

<template>
  <div class="w-full h-80 bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
    <div class="h-full">
      <ClientOnly>
        <apexchart 
          width="100%" 
          height="100%" 
          :type="chartOptions.chart.type" 
          :options="chartOptions" 
          :series="series"
        />
        <template #fallback>
          <div class="flex items-center justify-center h-full text-gray-400">
            Loading Chart...
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>
