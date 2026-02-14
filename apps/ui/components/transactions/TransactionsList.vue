```
<script lang="ts" setup>
import { useTransactionStore } from '~/store/transaction';
import { getFullCategoryName } from '~/store/category';
import { useAssertStore } from '~/store/assert'; // Import Assert Store
import type { Assert } from '~/store/assert.model'; // Import Assert type for better typing
import { useDialog } from '~/store/dialog';
import AssertEditDialog from '~/components/dialog/AssertEditDialog.vue';
import ConfirmDelete from '~/components/dialog/ConfirmDelete.vue';

import CategoryColorBox from '~/components/transactions/CategoryColorBox.vue';
import { textColorByAmount } from '~/utils/textColorByAmount';
import { formatAmount } from '~/utils/formatAmount';
import ContextMenu from '~/components/menu/ContextMenu.vue';
import {
  type ExtendedFullTransaction,
  prepareTransactionsToDisplay,
  type TransactionFilter,
} from '~/utils/prepareTransactionsToDisplay';
import AppContainer from '~/components/shared/AppContainer.vue';
import CategoryPicker from '~/components/category/CategoryPicker.vue';

const transactionStore = useTransactionStore();
const assertStore = useAssertStore();
const dialog = useDialog();

const props = defineProps<{ filter?: TransactionFilter }>();

const transactions = computed<ExtendedFullTransaction[]>(
  (): ExtendedFullTransaction[] => {
    return prepareTransactionsToDisplay(
      transactionStore.transactions,
      props.filter ?? {},
    );
  },
);

// Search Logic
const searchQuery = ref('');

const filteredTransactions = computed(() => {
  let result = transactions.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(t =>
      (t.payee && t.payee.toLowerCase().includes(q)) ||
      (t.memo && t.memo.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (formatAmount(t.amount).includes(q))
    );
  }
  return result;
});

// Display Logic (Reverse for descending date)
const displayedTransactions = computed(() => filteredTransactions.value.slice().reverse());

// Merged List Logic (Transactions + Asserts)
const mergedList = computed(() => {
  const txs = displayedTransactions.value;
  // If searching, hide asserts to avoid noise
  if (searchQuery.value) {
    return txs.map(t => ({ type: 'tx' as const, data: t, id: t.id }));
  }

  // Only show asserts if filtering by specific account
  if (!props.filter?.accountId) {
    return txs.map(t => ({ type: 'tx' as const, data: t, id: t.id }));
  }

  const accountAsserts = assertStore.getByAccountId(props.filter.accountId);
  // Sort asserts descending
  const sortedAsserts = [...accountAsserts].sort((a, b) => b.date.localeCompare(a.date));

  const list: Array<
    | { type: 'tx', data: ExtendedFullTransaction, id: string }
    | { type: 'assert', data: Assert, id: string, actual: number, diff: number }
  > = [];

  let txIndex = 0;
  let assertIndex = 0;

  while (txIndex < txs.length || assertIndex < sortedAsserts.length) {
    const tx = txs[txIndex];
    const assert = sortedAsserts[assertIndex];

    const currentBalance = txs[txIndex]?.accountSubBalance ?? 0;

    if (!assert) {
      list.push({ type: 'tx', data: tx!, id: tx!.id });
      txIndex++;
    } else if (!tx) {
      // End of transaction list (oldest time). Balance is 0.
      const actual = 0;
      list.push({ type: 'assert', data: assert, id: assert.id, actual, diff: actual - assert.value });
      assertIndex++;
    } else {
      // Compare dates (YYYY-MM-DD)
      const txDateDay = (tx!.date || '').split('T')[0];

      if (txDateDay > assert.date) {
        list.push({ type: 'tx', data: tx!, id: tx!.id });
        txIndex++;
      } else {
        // Assert is newer or same day.
        // In descending list, same day means Assert comes BEFORE transactions of that day.
        // So we insert Assert using Current Balance (balance after next transaction).
        const actual = currentBalance;
        list.push({ type: 'assert', data: assert, id: assert.id, actual, diff: actual - assert.value });
        assertIndex++;
      }
    }
  }
  return list;
});

const route = useRoute();

// Selection Logic
const selectedIds = ref<string[]>([]);
// ... (rest of logic same)

function toggleSelection(id: string): void {
  const idIndex = selectedIds.value.findIndex(
    (selectedId) => selectedId === id,
  );
  if (idIndex === -1) {
    selectedIds.value.push(id);
  } else {
    selectedIds.value.splice(idIndex, 1);
  }
}

function selectAll() {
  const visibleIds = displayedTransactions.value.map(t => t.id);
  const allSelected = visibleIds.every(id => selectedIds.value.includes(id));

  if (allSelected) {
    selectedIds.value = [];
  } else {
    const newSelection = new Set([...selectedIds.value, ...visibleIds]);
    selectedIds.value = Array.from(newSelection);
  }
}

// Bulk Edit Logic
const bulkCategory = ref<string | undefined>(undefined);

async function applyBulkCategory() {
  if (!bulkCategory.value) return;

  if (confirm(`Update category to '${bulkCategory.value}' for ${selectedIds.value.length} transactions?`)) {
    for (const id of selectedIds.value) {
      await transactionStore.update(id, { category: bulkCategory.value });
    }
    selectedIds.value = [];
    bulkCategory.value = undefined;
  }
}

// Assert Actions
function handleAddAssert() {
  if (!props.filter?.accountId) return;
  dialog.openDialog(AssertEditDialog, {
    initialData: {
      accountId: props.filter.accountId,
      date: new Date().toISOString().split('T')[0],
      value: 0
    }
  });
}

function handleEditAssert(assert: Assert) {
  dialog.openDialog(AssertEditDialog, {
    initialData: { ...assert }
  });
}

function handleDeleteAssert(id: string) {
  dialog.openDialog(ConfirmDelete, {
    resource: 'assert',
    id
  });
}
</script>

<template>
  <AppContainer
    v-if="transactions.length || (props.filter?.accountId && assertStore.getByAccountId(props.filter.accountId).length)"
    class="mt-6">
    <UCard>
      <!-- Controls -->
      <div class="mb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <!-- Controls Content Same -->
        <div class="flex-grow w-full md:w-auto flex gap-2">
          <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass" class="flex-grow"
            placeholder="Search Payee, Memo, Category..." />

          <!-- Add Assert Button -->
          <UButton v-if="props.filter?.accountId" label="Add Assert" icon="i-heroicons-chart-bar" variant="subtle"
            color="neutral" @click="handleAddAssert" />
        </div>

        <div class="flex gap-2 items-center">
          <span v-if="selectedIds.length > 0" class="text-sm font-medium">{{ selectedIds.length }} selected</span>
          <UButton
            :label="selectedIds.length > 0 && selectedIds.length === displayedTransactions.length ? 'Deselect All' : 'Select All'"
            variant="ghost" color="neutral" @click="selectAll" />
        </div>
      </div>

      <!-- Bulk Edit UI -->
      <div v-if="selectedIds.length > 0"
        class="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-end gap-2 transition-all">
        <div class="w-full sm:w-64">
          <CategoryPicker v-model="bulkCategory" label="Set Category for Selected" />
        </div>
        <div class="flex gap-2 mt-2 sm:mt-0">
          <UButton label="Apply" :disabled="!bulkCategory" @click="applyBulkCategory" color="primary" />
          <UButton label="Cancel" variant="ghost" color="neutral" @click="selectedIds = []" />
        </div>
      </div>

      <!-- List -->
      <ul>
        <template v-for="(item, index) of mergedList" :key="item.id">
          <!-- Transaction Item -->
          <li v-if="item.type === 'tx'" :id="item.data.id" :class="{
            'border-green-300 border bg-green-100':
              route.hash === '#' + item.data.id,
            'bg-indigo-100 dark:bg-indigo-900/50': selectedIds.includes(item.data.id),
          }">
            <ContextMenu :id="item.data.id" resource="transaction">
              <div
                class="flex justify-between items-start my-1 p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div class="flex items-center">
                  <div class="mr-2" v-if="selectedIds.includes(item.data.id)">
                    <UIcon name="i-heroicons-check-circle" class="text-primary-500 w-5 h-5" />
                  </div>
                  <DateView :date="item.data.date" class="w-16 cursor-pointer hover:text-primary-500"
                    @click="toggleSelection(item.data.id)" />
                </div>

                <NuxtLink :to="`/transaction/${item.data.id}`"
                  class="flex-grow flex justify-between items-start select-none">
                  <CategoryColorBox :color="item.data.color" :extended="!props.filter?.accountId" />
                  <div class="flex-grow ml-2 w-10 shrink-0">
                    <p v-if="!props.filter?.accountId" class="text-xs text-gray-500">
                      {{ item.data.account }}
                    </p>
                    <p class="font-bold truncate">
                      {{ item.data.payee || item.data.memo || 'No Payee' }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {{ getFullCategoryName(item.data) }}
                    </p>
                  </div>
                  <div class="text-right shrink-0 min-w-[80px]">
                    <p :class="textColorByAmount(item.data.amount)" class="font-bold whitespace-nowrap">
                      {{ formatAmount(item.data.amount) }}
                      {{ item.data.currency }}
                    </p>
                    <p class="text-xs text-gray-400">
                      {{ formatAmount(item.data.accountSubBalance) }}
                    </p>
                  </div>
                </NuxtLink>
              </div>
            </ContextMenu>
          </li>

          <!-- Assert Item -->
          <li v-else :id="item.data.id"
            class="relative py-2 my-2 group hover:bg-gray-50 dark:hover:bg-gray-800/20 rounded">
            <div class="absolute left-0 right-0 h-px transition-colors duration-300 top-1/2 -z-10"
              :class="Math.abs(item.diff) < 0.005 ? 'bg-green-200 dark:bg-green-900' : 'bg-red-200 dark:bg-red-900'">
            </div>
            <div
              class="flex justify-between items-center text-xs px-3 py-1 bg-white dark:bg-gray-900 border rounded-full w-max mx-auto shadow-sm relative z-0"
              :class="Math.abs(item.diff) < 0.005 ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-red-500 text-red-600 dark:text-red-400'">
              <!-- Assert Info -->
              <span class="font-bold mr-2">{{ item.data.date }}</span>
              <span class="font-mono">Expected: {{ formatAmount(item.data.value) }}</span>
              <span v-if="Math.abs(item.diff) >= 0.005" class="ml-2 flex items-center gap-1">
                <span class="text-gray-400">|</span>
                <span>Actual: {{ formatAmount(item.actual) }}</span>
                <span class="font-bold">(Diff: {{ formatAmount(item.diff) }})</span>
              </span>
              <UIcon v-if="Math.abs(item.diff) < 0.005" name="i-heroicons-check-badge" class="ml-2 w-4 h-4" />
              <UIcon v-else name="i-heroicons-exclamation-triangle" class="ml-2 w-4 h-4" />
            </div>

            <!-- Assert Actions (Hover) -->
            <div
              class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10 bg-white dark:bg-gray-900 shadow-sm rounded-md border border-gray-100 dark:border-gray-700 px-1">
              <UButton icon="i-heroicons-pencil-square" size="xs" color="neutral" variant="ghost"
                @click="handleEditAssert(item.data)" title="Edit Assert" />
              <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost"
                @click="handleDeleteAssert(item.data.id)" title="Delete Assert" />
            </div>
          </li>
        </template>
      </ul>

      <div v-if="mergedList.length === 0" class="text-center py-8 text-gray-500">
        No transactions found.
      </div>
    </UCard>
  </AppContainer>
</template>
```
