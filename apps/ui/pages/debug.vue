<script setup lang="ts">
import { useCategoryStore } from '~/store/category';
import { useDialog } from '~/store/dialog';
import ConfirmDelete from '~/components/dialog/ConfirmDelete.vue';
import { useAccountStore } from '~/store/account';
import { useTransactionStore } from '~/store/transaction';
import { useDebugStore } from '~/store/debug';

const debugStore = useDebugStore();
import { deleteTransaction as syncDeleteTransaction } from '~/sync/manager';

const items = ref(['Backlog', 'Todo', 'In Progress', 'Done'])
const value = ref('Backlog')

const categoryStore = useCategoryStore();
const accountStore = useAccountStore();
const transactionStore = useTransactionStore();

const dialog = useDialog(); // Hoist dialog controller

function openModal() {
  console.log('openModal');
  dialog.openDialog(ConfirmDelete, {
    resource: 'category',
    id: '6ebddb35a1b',
  });
}

function cleanupOrphans() {
  const accountIds = new Set(accountStore.accounts.map((a) => a.id));
  const orphans = transactionStore.transactions.filter(
    (t) => !accountIds.has(t.accountId)
  );

  if (orphans.length === 0) {
    alert('No orphaned transactions found.');
    return;
  }

  if (
    confirm(
      `Found ${orphans.length} transactions belonging to non-existent accounts. Delete them?`
    )
  ) {
    let count = 0;
    orphans.forEach((t) => {
      transactionStore.delete(t.id);
      count++;
    });
    alert(`Deleted ${count} transactions.`);
  }
}

function cleanupCorrupted() {
  const corrupted = transactionStore.transactions.filter(
    (t) => !t.date || t.amount === undefined || !t.accountId
  );

  if (corrupted.length === 0) {
    alert('No corrupted transactions found.');
    return;
  }

  if (
    confirm(
      `Found ${corrupted.length} corrupted transactions (missing date/amount/account). Delete them?`
    )
  ) {
    let count = 0;
    corrupted.forEach((t) => {
      const index = transactionStore.getIndexById(t.id);
      if (index !== -1) {
        // Manual delete to avoid side-effects using corrupted data
        transactionStore.$state.transactions.splice(index, 1);
        syncDeleteTransaction(t.id);
      }
      count++;
    });
    alert(`Deleted ${count} corrupted transactions locally. Please Sync/Refresh.`);
  }
}
</script>

<template>
  <div class="p-4">
    <div class="mb-4">
      <UCheckbox v-model="debugStore.showFps" label="Show FPS Counter" />
    </div>

    <UButton label="Open" color="neutral" variant="subtle" @click="openModal" />
    <UButton label="Cleanup Orphans" color="error" variant="solid" class="ml-2" @click="cleanupOrphans" />
    <UButton label="Cleanup Corrupted" color="error" variant="outline" class="ml-2" @click="cleanupCorrupted" />

    <USelectMenu v-model="value" :items="items" />
    <p>Selected: {{ value }}</p>
    <pre>{{ accountStore.accounts }}</pre>
    <hr>
    <pre>{{ transactionStore.transactions }}</pre>
    <!-- <dialog-root /> -->




  </div>
</template>
