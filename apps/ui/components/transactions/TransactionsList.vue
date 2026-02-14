<script lang="ts" setup>
import { useTransactionStore } from '~/store/transaction';
import { getFullCategoryName } from '~/store/category';

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

const route = useRoute();

// Selection Logic
const selectedIds = ref<string[]>([]);

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
  // If all visible are selected, deselect all.
  // Otherwise, select all visible.
  const visibleIds = displayedTransactions.value.map(t => t.id);
  const allSelected = visibleIds.every(id => selectedIds.value.includes(id));

  if (allSelected) {
    selectedIds.value = [];
  } else {
    // Merge visible IDs into selectedIds without duplicates
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
    // Optional: Clear selection after apply?
    selectedIds.value = [];
    bulkCategory.value = undefined;
  }
}
</script>

<template>
  <AppContainer v-if="transactions.length" class="mt-6">
    <UCard>
      <!-- Controls -->
      <div class="mb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div class="flex-grow w-full md:w-auto">
          <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass" class="w-full"
            placeholder="Search Payee, Memo, Category..." />
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
        <li v-for="(transaction, index) of displayedTransactions" :id="transaction.id" :key="transaction.id" :class="{
          'border-green-300 border bg-green-100':
            route.hash === '#' + transaction.id,
          'bg-indigo-100 dark:bg-indigo-900/50': selectedIds.includes(transaction.id),
        }">
          <ContextMenu :id="transaction.id" resource="transaction">
            <div
              class="flex justify-between items-start my-1 p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div class="flex items-center">
                <!-- Checkbox fallback or visual indicator of selection on date click -->
                <div class="mr-2" v-if="selectedIds.includes(transaction.id)">
                  <UIcon name="i-heroicons-check-circle" class="text-primary-500 w-5 h-5" />
                </div>
                <DateView :date="transaction.date" class="w-16 cursor-pointer hover:text-primary-500"
                  @click="toggleSelection(transaction.id)" />
              </div>

              <NuxtLink :to="`/transaction/${transaction.id}`"
                class="flex-grow flex justify-between items-start select-none">
                <CategoryColorBox :color="transaction.color" :extended="!props.filter?.accountId" />
                <div class="flex-grow ml-2 w-10 shrink-0">
                  <p v-if="!props.filter?.accountId" class="text-xs text-gray-500">
                    {{ transaction.account }}
                  </p>
                  <p class="font-bold truncate">
                    {{ transaction.payee || transaction.memo || 'No Payee' }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {{ getFullCategoryName(transaction) }}
                  </p>
                </div>
                <div class="text-right shrink-0 min-w-[80px]">
                  <p :class="textColorByAmount(transaction.amount)" class="font-bold whitespace-nowrap">
                    {{ formatAmount(transaction.amount) }}
                    {{ transaction.currency }}
                  </p>
                  <p class="text-xs text-gray-400">
                    {{ formatAmount(transaction.accountSubBalance) }}
                  </p>
                </div>
              </NuxtLink>
            </div>
          </ContextMenu>
        </li>
      </ul>

      <div v-if="displayedTransactions.length === 0" class="text-center py-8 text-gray-500">
        No transactions found matching your search.
      </div>
    </UCard>
  </AppContainer>
</template>
