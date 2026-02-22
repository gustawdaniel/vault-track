<script setup lang="ts">
import { useCategoryStore } from '~/store/category';
import { useDialog } from '~/store/dialog';
import ConfirmDelete from '~/components/dialog/ConfirmDelete.vue';
import { useAccountStore } from '~/store/account';
import { useTransactionStore } from '~/store/transaction';
import { useDebugStore } from '~/store/debug';

const debugStore = useDebugStore();
import { deleteTransaction as syncDeleteTransaction } from '~/sync/manager';

// ---- Backend debug ----
const config = useRuntimeConfig();
const backendUrl = config.public.backendUrl;

const pingResult = ref<{ status: number | null, body: string, error: string, duration: number | null, origin: string } | null>(null);
const pinging = ref(false);
const windowOrigin = computed(() => (typeof window !== 'undefined' ? window.location.origin : 'SSR'));

async function pingBackend() {
  pinging.value = true;
  pingResult.value = null;
  const start = Date.now();
  try {
    const apiRoot = backendUrl.replace(/\/api$/, '');
    const res = await fetch(`${apiRoot}/`);
    const body = await res.text();
    pingResult.value = { status: res.status, body, error: '', duration: Date.now() - start, origin: window.location.origin };
  } catch (e: unknown) {
    pingResult.value = { status: null, body: '', error: String(e), duration: Date.now() - start, origin: window.location.origin };
  } finally {
    pinging.value = false;
  }
}

// ---- Nuclear sync reset ----
const resetting = ref(false);
const resetResult = ref<string | null>(null);

async function nuclearReset() {
  if (!confirm('⚠️ This will DELETE ALL sync events from the server AND clear your local IndexedDB. You will need to re-import your data. Are you absolutely sure?')) return;

  resetting.value = true;
  resetResult.value = null;
  try {
    // 1. Delete server events
    const groupId = localStorage.getItem('ocm-sync-group-id');
    if (groupId) {
      const res = await fetch(`${backendUrl}/sync/events`, {
        method: 'DELETE',
        headers: { 'X-Sync-Group-ID': groupId },
      });
      const body = await res.json() as { deleted?: number, error?: string };
      if (!res.ok) throw new Error(body.error || `Server error ${res.status}`);
      resetResult.value = `Server: deleted ${body.deleted} events. `;
    } else {
      resetResult.value = 'No group ID found (skipped server delete). ';
    }

    // 2. Clear IndexedDB
    const dbs = await indexedDB.databases();
    for (const dbInfo of dbs) {
      if (dbInfo.name) indexedDB.deleteDatabase(dbInfo.name);
    }

    // 3. Clear sync-related localStorage keys
    const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('ocm-'));
    keysToRemove.forEach(k => localStorage.removeItem(k));

    resetResult.value += `Local: cleared ${dbs.length} IndexedDB databases and ${keysToRemove.length} localStorage keys.`;

    setTimeout(() => { window.location.reload(); }, 2000);
  } catch (e: unknown) {
    resetResult.value = `Error: ${String(e)}`;
  } finally {
    resetting.value = false;
  }
}

// ---- Sync diagnostics ----
const syncDiag = ref<{ groupId: string, mnemonic: string, serverEvents: number | null, localCursor: number | null, error: string } | null>(null);
const diagLoading = ref(false);

async function runSyncDiag() {
  diagLoading.value = true;
  syncDiag.value = null;
  try {
    const groupId = localStorage.getItem('ocm-sync-group-id') || '';
    const mnemonic = localStorage.getItem('ocm-mnemonic') || '';

    // Check server event count from cursor=0
    let serverEvents: number | null = null;
    let error = '';
    if (groupId) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch(`${backendUrl}/sync/pull?cursor=0&wait=false`, {
          headers: { 'X-Sync-Group-ID': groupId },
          signal: ctrl.signal,
        });
        clearTimeout(tid);
        const data = await res.json() as { events?: unknown[] };
        serverEvents = data.events?.length ?? 0;
      } catch (e) { error = String(e); }
    } else {
      error = 'No ocm-sync-group-id in localStorage';
    }

    // Check local cursor
    let localCursor: number | null = null;
    try {
      const { getCursor } = await import('~/sync/cursor');
      const c = await getCursor('server');
      localCursor = c?.serverRowId ?? 0;
    } catch (_e) { /* ignore */ }

    syncDiag.value = {
      groupId: groupId ? `${groupId.substring(0, 16)}...` : '(none)',
      mnemonic: mnemonic ? `${mnemonic.substring(0, 20)}...` : '(none)',
      serverEvents,
      localCursor,
      error,
    };
  } finally {
    diagLoading.value = false;
  }
}

async function resetCursor() {
  try {
    const { updateCursor } = await import('~/sync/cursor');
    await updateCursor('server', { serverRowId: 0, timestamp: 0, lastEventId: '' });
    alert('Cursor reset to 0. Go to Settings → Sync and click "Sync Now" to re-pull all data.');
    await runSyncDiag();
  } catch (e) {
    alert('Failed to reset cursor: ' + String(e));
  }
}

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

    <!-- ===== Backend Connectivity ===== -->
    <div class="mb-6 rounded-lg border border-gray-200 p-4 bg-gray-50 font-mono text-sm">
      <h2 class="font-bold text-base mb-2">🔗 Backend Debug</h2>
      <div class="mb-2">
        <span class="text-gray-500">API URL:</span>
        <span class="ml-2 text-blue-700 break-all">{{ backendUrl }}</span>
      </div>
      <div class="mb-2">
        <span class="text-gray-500">Window origin:</span>
        <span class="ml-2 text-purple-700">{{ windowOrigin }}</span>
      </div>
      <UButton label="Ping /health" :loading="pinging" color="primary" variant="solid" size="sm" @click="pingBackend" />
      <div v-if="pingResult" class="mt-3 rounded p-3"
        :class="pingResult.error ? 'bg-red-50 border border-red-300' : 'bg-green-50 border border-green-300'">
        <div v-if="pingResult.status !== null"><span class="text-gray-500">Status:</span> <strong>{{ pingResult.status
        }}</strong></div>
        <div><span class="text-gray-500">Duration:</span> <strong>{{ pingResult.duration }}ms</strong></div>
        <div><span class="text-gray-500">My origin:</span> <strong>{{ pingResult.origin }}</strong></div>
        <div v-if="pingResult.body"><span class="text-gray-500">Response:</span> <code
            class="break-all">{{ pingResult.body }}</code></div>
        <div v-if="pingResult.error" class="text-red-600"><span class="text-gray-500">Error:</span> {{ pingResult.error
        }}</div>
      </div>
    </div>

    <!-- ===== Nuclear Sync Reset ===== -->
    <div class="mb-6 rounded-lg border border-red-300 p-4 bg-red-50 font-mono text-sm">
      <h2 class="font-bold text-base mb-2 text-red-700">☢️ Nuclear Sync Reset</h2>
      <p class="text-red-600 mb-3 text-xs">Deletes ALL sync events from the server for your group and clears local
        IndexedDB. Use this after exporting your data. On other devices, open /debug and click the same button — it will
        only clear local data (nothing left to delete on server).</p>
      <UButton label="☢️ NUCLEAR RESET — Delete all sync data" :loading="resetting" color="error" variant="solid"
        size="sm" @click="nuclearReset" />
      <div v-if="resetResult" class="mt-3 rounded p-2 bg-white border border-red-200 text-red-800 text-xs">
        {{ resetResult }}
      </div>
    </div>

    <!-- ===== Sync Diagnostics ===== -->
    <div class="mb-6 rounded-lg border border-yellow-300 p-4 bg-yellow-50 font-mono text-sm">
      <h2 class="font-bold text-base mb-2 text-yellow-800">🔍 Sync Diagnostics</h2>
      <UButton label="Run Sync Diagnostics" :loading="diagLoading" color="warning" variant="outline" size="sm"
        @click="runSyncDiag" />
      <div v-if="syncDiag" class="mt-3 space-y-1 text-xs">
        <div><span class="text-gray-500">Group ID:</span> <code>{{ syncDiag.groupId }}</code></div>
        <div><span class="text-gray-500">Mnemonic:</span> <code>{{ syncDiag.mnemonic }}</code></div>
        <div>
          <span class="text-gray-500">Server events (cursor=0):</span>
          <strong :class="syncDiag.serverEvents === 0 ? 'text-red-600' : 'text-green-600'">
            {{ syncDiag.serverEvents ?? 'N/A' }}
          </strong>
          <span v-if="syncDiag.serverEvents === 0" class="text-red-600 ml-1">⚠️ Group ID mismatch or server
            empty!</span>
          <span v-else-if="syncDiag.serverEvents !== null" class="text-yellow-700 ml-1">(limited to 2000 per
            pull)</span>
        </div>
        <div><span class="text-gray-500">Local cursor (serverRowId):</span> <code>{{ syncDiag.localCursor }}</code>
        </div>
        <div v-if="syncDiag.error" class="text-red-600">Error: {{ syncDiag.error }}</div>
        <div class="mt-3">
          <UButton label="Reset Cursor to 0 (force full re-pull)" color="warning" variant="solid" size="xs"
            @click="resetCursor" />
          <p class="text-yellow-700 text-xs mt-1">Zeros your local sync cursor without deleting any data. Then go to
            Settings → Sync → Sync Now to re-pull everything from the server.</p>
        </div>
      </div>
    </div>

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
