<script lang="ts" setup>
import { getFullCategoryName } from '~/store/category';
import type { Assert } from '~/store/assert.model';
import CategoryColorBox from '~/components/transactions/CategoryColorBox.vue';
import { textColorByAmount } from '~/utils/textColorByAmount';
import { formatAmount } from '~/utils/formatAmount';
import ContextMenu from '~/components/menu/ContextMenu.vue';
import type { ExtendedFullTransaction } from '~/utils/prepareTransactionsToDisplay';

type MergedItem =
  | { type: 'tx'; data: ExtendedFullTransaction; id: string }
  | { type: 'assert'; data: Assert; id: string; actual: number; diff: number };

const props = defineProps<{
  item: MergedItem;
  routeHash: string;
  selectedIds: string[];
  showAccount: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-selection', id: string): void;
  (e: 'edit-assert', assert: Assert): void;
  (e: 'delete-assert', id: string): void;
  (e: 'edit-transaction', id: string): void;
}>();

const isTx = computed(() => props.item.type === 'tx');
const tx = computed(() => (props.item.type === 'tx' ? props.item.data : null));
const assertItem = computed(() =>
  props.item.type === 'assert' ? props.item : null,
);
</script>

<template>
  <!-- Transaction Item -->
  <div v-if="isTx && tx" :id="tx.id" :class="{
    'border-green-300 border bg-green-100': routeHash === '#' + tx.id,
    'bg-indigo-100 dark:bg-indigo-900/50': selectedIds.includes(tx.id),
  }">
    <ContextMenu :id="tx.id" resource="transaction">
      <div
        class="flex justify-between items-start my-1 p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <div class="flex items-center">
          <div class="mr-2" v-if="selectedIds.includes(tx.id)">
            <UIcon name="i-heroicons-check-circle" class="text-primary-500 w-5 h-5" />
          </div>
          <DateView :date="tx.date" class="w-16 cursor-pointer hover:text-primary-500"
            @click="emit('toggle-selection', tx.id)" />
        </div>

        <div
          class="flex-grow flex justify-between items-start select-none cursor-pointer hover:opacity-80 transition-opacity"
          @click="emit('edit-transaction', tx.id)">
          <CategoryColorBox :color="tx.color" :extended="showAccount" />
          <div class="flex-grow ml-2 w-10 shrink-0">
            <p v-if="showAccount" class="text-xs text-gray-500">
              {{ tx.account }}
            </p>
            <p class="font-bold truncate">
              {{ tx.payee || tx.memo || 'No Payee' }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ getFullCategoryName(tx) }}
            </p>
          </div>
          <div class="text-right shrink-0 min-w-[80px]">
            <p :class="textColorByAmount(tx.amount)" class="font-bold whitespace-nowrap">
              {{ formatAmount(tx.amount, tx.currency) }}
              {{ tx.currency }}
            </p>
            <p class="text-xs text-gray-400">
              {{ formatAmount(tx.accountSubBalance, tx.currency) }}
            </p>
          </div>
        </div>
      </div>
    </ContextMenu>
  </div>

  <!-- Assert Item -->
  <div v-else-if="assertItem" :id="assertItem.data.id"
    class="relative py-2 my-2 group hover:bg-gray-50 dark:hover:bg-gray-800/20 rounded">
    <div class="absolute left-0 right-0 h-px transition-colors duration-300 top-1/2 -z-10" :class="Math.abs(assertItem.diff) < 0.005
        ? 'bg-green-200 dark:bg-green-900'
        : 'bg-red-200 dark:bg-red-900'
      "></div>
    <div
      class="flex justify-between items-center text-xs px-3 py-1 bg-white dark:bg-gray-900 border rounded-full w-max mx-auto shadow-sm relative z-0"
      :class="Math.abs(assertItem.diff) < 0.005
          ? 'border-green-500 text-green-600 dark:text-green-400'
          : 'border-red-500 text-red-600 dark:text-red-400'
        ">
      <span class="font-bold mr-2">{{ assertItem.data.date }}</span>
      <span class="font-mono">Expected: {{ formatAmount(assertItem.data.value) }}</span>
      <span v-if="Math.abs(assertItem.diff) >= 0.005" class="ml-2 flex items-center gap-1">
        <span class="text-gray-400">|</span>
        <span>Actual: {{ formatAmount(assertItem.actual) }}</span>
        <span class="font-bold">(Diff: {{ formatAmount(assertItem.diff) }})</span>
      </span>
      <UIcon v-if="Math.abs(assertItem.diff) < 0.005" name="i-heroicons-check-badge" class="ml-2 w-4 h-4" />
      <UIcon v-else name="i-heroicons-exclamation-triangle" class="ml-2 w-4 h-4" />
    </div>

    <div
      class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10 bg-white dark:bg-gray-900 shadow-sm rounded-md border border-gray-100 dark:border-gray-700 px-1">
      <UButton icon="i-heroicons-pencil-square" size="xs" color="neutral" variant="ghost"
        @click="emit('edit-assert', assertItem.data)" title="Edit Assert" />
      <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost"
        @click="emit('delete-assert', assertItem.data.id)" title="Delete Assert" />
    </div>
  </div>
</template>
