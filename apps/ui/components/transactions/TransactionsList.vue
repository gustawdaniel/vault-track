```
<script lang="ts" setup>
import { useTransactionStore } from '~/store/transaction';
import { useAssertStore } from '~/store/assert';
import { useCategoryStore } from '~/store/category';
import { useAccountStore } from '~/store/account';
import type { Assert } from '~/store/assert.model';
import { useDialog } from '~/store/dialog';
import AssertEditDialog from '~/components/dialog/AssertEditDialog.vue';
import ConfirmDelete from '~/components/dialog/ConfirmDelete.vue';
import SingleTransactionEdit from '~/components/transactions/SingleTransactionEdit.vue';

import { formatAmount } from '~/utils/formatAmount';
import {
  type ExtendedFullTransaction,
  prepareTransactionsToDisplay,
  type TransactionFilter,
} from '~/utils/prepareTransactionsToDisplay';
import AppContainer from '~/components/shared/AppContainer.vue';
import CategoryPicker from '~/components/category/CategoryPicker.vue';
import { useVirtualizer } from '@tanstack/vue-virtual';
import VirtualTransactionRow from '~/components/transactions/VirtualTransactionRow.vue';


const transactionStore = useTransactionStore();
const assertStore = useAssertStore();
const categoryStore = useCategoryStore();
const accountStore = useAccountStore();
const dialog = useDialog();

const props = defineProps<{ filter?: TransactionFilter }>();

const transactions = computed<ExtendedFullTransaction[]>(
  (): ExtendedFullTransaction[] => {
    // console.time('prepareTransactionsToDisplay');
    const res = prepareTransactionsToDisplay(
      transactionStore.transactions,
      props.filter ?? {},
    );
    // console.timeEnd('prepareTransactionsToDisplay');
    return res;
  },
);

// Search Logic

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

// Virtual Scroll
const parentRef = ref<HTMLElement | null>(null);

const virtualizer = useVirtualizer(
  computed(() => ({
    count: mergedList.value.length,
    getScrollElement: () => parentRef.value,
    estimateSize: () => 56,
    overscan: 10,
    getItemKey: (index) => mergedList.value[index]?.id ?? index,
  })),
);

const virtualRows = computed(() => virtualizer.value.getVirtualItems());
const totalSize = computed(() => virtualizer.value.getTotalSize());

// Scroll to hash-linked transaction on mount
onMounted(() => {
  if (route.hash) {
    const targetId = route.hash.slice(1);
    const index = mergedList.value.findIndex(item => item.id === targetId);
    if (index !== -1) {
      virtualizer.value.scrollToIndex(index, { align: 'center' });
    }
  }
});

// Reset scroll position when search changes
watch(searchQuery, () => {
  virtualizer.value.scrollToIndex(0);
});

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

function deleteSelected() {
  const count = selectedIds.value.length;
  if (!count) return;

  if (confirm(`Are you sure you want to delete ${count} transaction${count > 1 ? 's' : ''}? This cannot be undone.`)) {
    for (const id of selectedIds.value) {
      transactionStore.delete(id);
    }
    selectedIds.value = [];
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

function handleEditTransaction(id: string) {
  const transaction = transactionStore.getById(id);
  if (!transaction) return;

  const reverseTransaction = transactionStore.getReverseByIdAndHash(
    id,
    transaction.transferHash,
  );

  dialog.openDialog(
    SingleTransactionEdit,
    {
      transaction,
      ...(reverseTransaction ? { reverseTransaction } : {}),
      onExit: () => dialog.closeDialog(),
    },
    { fullscreen: true, title: 'Edit Transaction' },
  );
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
          <UButton label="Delete Selected" icon="i-heroicons-trash" color="error" variant="soft" @click="deleteSelected" />
        </div>
      </div>

      <!-- Virtual Scroll List -->
      <div
        ref="parentRef"
        class="overflow-auto"
        style="height: calc(100vh - 280px); min-height: 300px;"
      >
        <div
          :style="{ height: `${totalSize}px`, width: '100%', position: 'relative' }"
        >
          <div
            v-for="virtualRow in virtualRows"
            :key="String(virtualRow.key)"
            :ref="(el) => { if (el) virtualizer.measureElement(el as Element) }"
            :data-index="virtualRow.index"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }"
          >
            <VirtualTransactionRow
              :item="mergedList[virtualRow.index]!"
              :route-hash="route.hash"
              :selected-ids="selectedIds"
              :show-account="!props.filter?.accountId"
              @toggle-selection="toggleSelection"
              @edit-assert="handleEditAssert"
              @delete-assert="handleDeleteAssert"
              @edit-transaction="handleEditTransaction"
            />
          </div>
        </div>
      </div>

      <div v-if="mergedList.length === 0" class="text-center py-8 text-gray-500">
        No transactions found.
      </div>
    </UCard>
  </AppContainer>
</template>
```
