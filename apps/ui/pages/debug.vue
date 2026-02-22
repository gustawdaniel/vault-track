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
import { updateTransactionBatch } from '~/sync/manager';

function normalizeData() {
  const accountMap = new Map(accountStore.accounts.map(a => [a.id, a.name]));
  const transactionsToUpdate: ReturnType<typeof transactionStore.transactions[0]>[] = [];

  transactionStore.transactions.forEach(t => {
    let modified = false;
    const updatePayload = { ...t };

    // 1. Fix date strings (e.g. "2024-03-24T00:00:00" -> "2024-03-24")
    if (updatePayload.date && updatePayload.date.includes('T')) {
      updatePayload.date = updatePayload.date.substring(0, 10);
      modified = true;
    }

    // 2. Fix account names
    const exactAccountName = accountMap.get(updatePayload.accountId);
    if (exactAccountName && updatePayload.account !== exactAccountName) {
      updatePayload.account = exactAccountName;
      modified = true;
    }

    // 3. Fix transfer category names
    if (updatePayload.transferHash && updatePayload.category?.startsWith('[')) {
      // Find the sibling
      const sibling = transactionStore.transactions.find(
        sib => sib.transferHash === updatePayload.transferHash && sib.id !== updatePayload.id
      );
      if (sibling) {
        const expectedTargetName = accountMap.get(sibling.accountId);
        if (expectedTargetName) {
          const expectedCategory = `[${expectedTargetName}]`;
          if (updatePayload.category !== expectedCategory) {
            updatePayload.category = expectedCategory;
            modified = true;
          }
        }
      }
    }

    // Replace the internal ID with what Sync Manager expects (id: string, spreading rest)
    if (modified) {
      transactionsToUpdate.push(updatePayload);
    }
  });

  if (transactionsToUpdate.length === 0) {
    alert('No corrupted or desynced historical transactions found.');
    return;
  }

  if (confirm(`Found ${transactionsToUpdate.length} anomalous transactions. Normalize and sync them?`)) {
    // We update them sequentially using the internal sync wrapper (can be batched if implemented, we'll try updateTransactionBatch)
    updateTransactionBatch(transactionsToUpdate).then(() => {
      alert(`Successfully normalized ${transactionsToUpdate.length} transactions.`);
    }).catch(e => {
      console.error('Normalization batch fail', e);
      alert('Failed to normalize. See console.');
    });
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
    <UButton label="Normalize Historical Data" color="primary" variant="solid" class="ml-2" @click="normalizeData" />

    <USelectMenu v-model="value" :items="items" class="mt-4" />
    <p>Selected: {{ value }}</p>
    <pre>{{ accountStore.accounts }}</pre>
    <hr>
    <pre>{{ transactionStore.transactions }}</pre>
    <!-- <dialog-root /> -->




  </div>
</template>
