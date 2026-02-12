<template>
    <AppContainer>
        <UCard class="mt-8">
            <template #header>
                <h2 class="text-xl font-bold">Synchronization Settings</h2>
            </template>

            <!-- 1. Setup / Pairing Mode -->
            <div v-if="!savedGroupId" class="space-y-6 text-center py-8">
                <div class="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <UIcon name="i-heroicons-cloud" class="text-3xl text-gray-400" />
                </div>
                <h3 class="text-lg font-semibold">Enable Synchronization</h3>
                <p class="text-gray-600 max-w-md mx-auto">
                    Sync is disabled by default to protect your data. To sync between devices, you need to create or
                    enter a
                    <strong>Pairing Code</strong>.
                </p>

                <div class="max-w-md mx-auto mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100 text-left">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Enter Pairing Code</label>
                    <div class="flex gap-2">
                        <UInput v-model="groupId" type="text" class="flex-1" placeholder="e.g. my-secret-vault-123" />
                        <UTooltip text="Scan QR Code">
                            <UButton color="neutral" variant="ghost" icon="i-heroicons-qr-code"
                                @click="showScanner = true" />
                        </UTooltip>
                    </div>
                    <div class="flex justify-between items-center mt-2">
                        <UButton size="xs" color="primary" variant="link" class="p-0" @click="generateRandomCode">
                            Generate Random Code
                        </UButton>
                        <UButton @click="saveGroupId" color="primary" :disabled="!groupId">
                            Save & Connect
                        </UButton>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">
                        Treat this code like a password. Use the <strong>exact same code</strong> on all your devices.
                    </p>

                    <!-- QR Code Display -->
                    <div v-if="qrCodeUrl" class="mt-4 text-center">
                        <p class="text-xs text-gray-500 mb-2">Scan to connect another device</p>
                        <img :src="qrCodeUrl" alt="Pairing Code QR"
                            class="mx-auto border p-2 bg-white rounded shadow-sm w-48 h-48" />
                    </div>
                </div>

                <!-- Scanner Modal -->
                <!-- Scanner Modal -->
                <UModal v-model:open="showScanner" title="Scan Pairing Code" :ui="{ content: 'max-w-sm' }">
                    <template #body>
                        <div v-if="showScanner" class="aspect-square bg-black rounded overflow-hidden">
                            <QrcodeStream @detect="onScan" />
                        </div>
                    </template>
                </UModal>
            </div>

            <!-- 2. Dashboard Mode -->
            <div v-else class="space-y-6">
                <!-- Status Header -->
                <div class="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-100">
                    <div>
                        <div class="text-sm font-bold text-green-800 flex items-center gap-2">
                            <UIcon name="i-heroicons-check-circle" />
                            Sync Active
                        </div>
                        <div class="text-xs text-green-700 mt-1">
                            Pairing Code: <span class="font-mono font-bold">{{ savedGroupId }}</span>
                        </div>
                    </div>
                    <UButton size="xs" color="neutral" variant="ghost" @click="resetGroupId">Disconnect</UButton>
                </div>

                <div>
                    <h3 class="text-sm font-medium text-gray-700">Data Status</h3>
                    <div class="mt-2 grid grid-cols-2 gap-4">
                        <div class="p-3 bg-white rounded border">
                            <h4 class="text-xs font-bold text-gray-500 uppercase">Local (Pinia)</h4>
                            <div class="mt-1 flex justify-between text-sm">
                                <span>Accounts:</span>
                                <span class="font-mono font-bold">{{ localStats.accounts }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span>Transactions:</span>
                                <span class="font-mono font-bold">{{ localStats.transactions }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span>Categories:</span>
                                <span class="font-mono font-bold">{{ localStats.categories }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span>Projects:</span>
                                <span class="font-mono font-bold">{{ localStats.projects }}</span>
                            </div>
                        </div>
                        <div class="p-3 bg-gray-50 rounded border">
                            <h4 class="text-xs font-bold text-gray-500 uppercase">Synced (DB)</h4>
                            <div class="mt-1 flex justify-between text-sm">
                                <span>Accounts:</span>
                                <span class="font-mono font-bold">{{ syncStats.accounts }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span>Transactions:</span>
                                <span class="font-mono font-bold">{{ syncStats.transactions }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span>Categories:</span>
                                <span class="font-mono font-bold">{{ syncStats.categories }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span>Projects:</span>
                                <span class="font-mono font-bold">{{ syncStats.projects }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <hr />

                <!-- Device Info -->
                <div>
                    <label class="block text-sm font-medium text-gray-700">My Device ID</label>
                    <div class="mt-1 flex items-center gap-2">
                        <code class="bg-gray-100 px-2 py-1 rounded text-sm select-all">{{ deviceId }}</code>
                        <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-clipboard-document"
                            @click="copyDeviceId" />
                    </div>
                    <div class="mt-2">
                        <UButton size="xs" variant="link" class="p-0 text-primary-600" icon="i-heroicons-qr-code"
                            @click="showPairingCode = true">
                            Show Pairing Code & QR
                        </UButton>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">This ID uniquely identifies this browser session.</p>
                </div>

                <!-- Pairing Code Modal -->
                <!-- Pairing Code Modal -->
                <UModal v-model:open="showPairingCode" title="Pairing Code"
                    description="Use this code to connect other devices to your sync group."
                    :ui="{ content: 'max-w-sm' }">
                    <template #body>
                        <div class="text-center space-y-4">
                            <div
                                class="p-4 bg-gray-50 rounded font-mono font-bold text-lg border border-gray-200 break-all">
                                {{ savedGroupId }}
                            </div>
                            <div v-if="qrCodeUrl" class="flex justify-center">
                                <img :src="qrCodeUrl" alt="Pairing Code QR"
                                    class="border p-2 bg-white rounded shadow-sm w-48 h-48" />
                            </div>
                        </div>
                    </template>
                </UModal>

                <hr />

                <!-- Sync Actions -->
                <div>
                    <h3 class="text-lg font-semibold mb-2">Actions</h3>
                    <div class="flex gap-4">
                        <UTooltip
                            text="Uploads your local events to the server and downloads new changes from other devices.">
                            <UButton :loading="isSyncing" @click="handleSync" icon="i-heroicons-arrow-path">
                                Sync Now
                            </UButton>
                        </UTooltip>

                        <UTooltip
                            text="Converts your current local data (Accounts & Transactions) into Sync Events and uploads them. Use this ONLY ONCE on the first device.">
                            <UButton :loading="isMigrating" color="primary" variant="outline" @click="handleMigration"
                                icon="i-heroicons-circle-stack">
                                Migrate Local Data
                            </UButton>
                        </UTooltip>
                    </div>

                    <div class="mt-4 border-t pt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Emergency Restore</label>
                        <input type="file" ref="fileInput" class="hidden" accept=".json"
                            @change="handleRestoreBackup" />
                        <UButton color="neutral" icon="i-heroicons-arrow-up-tray"
                            @click="(fileInput as HTMLInputElement)?.click()">
                            Restore from JSON Backup
                        </UButton>
                        <p class="text-xs text-gray-500 mt-1">
                            Use this if you need to recover data from a backup file.
                        </p>
                    </div>
                    <p v-if="lastSyncTime" class="text-xs text-gray-500 mt-2">
                        Last synced: {{ lastSyncTime }}
                    </p>
                </div>

                <!-- Logs (simplified) -->
                <div v-if="logs.length" class="mt-4 p-4 bg-gray-50 rounded text-xs font-mono h-40 overflow-y-auto">
                    <div v-for="(log, i) in logs" :key="i">{{ log }}</div>
                </div>

            </div>
        </UCard>
    </AppContainer>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useClipboard } from '@vueuse/core';
import AppContainer from '~/components/shared/AppContainer.vue';
import { getDeviceId } from '~/sync/deviceId';
import { syncWithServer } from '~/sync/client';
import { deriveGroupId } from '~/sync/crypto';
import { useAccountStore } from '~/store/account';
import { useTransactionStore } from '~/store/transaction';
import { useCategoryStore } from '~/store/category';
import { useProjectStore } from '~/store/project';
import { createAccount, createTransaction, createCategory, createProject, importLocalData } from '~/sync/manager';
import { hydratePinia } from '~/sync/hydration';

// QR & Mnemonic
import { generateMnemonic } from 'bip39';
import QRCode from 'qrcode';
import { QrcodeStream } from 'vue-qrcode-reader';

const deviceId = ref('');
const groupId = ref('');
const savedGroupId = ref('');
const isSyncing = ref(false);
const isMigrating = ref(false);
const lastSyncTime = ref<string | null>(null);
const logs = ref<string[]>([]);
const showScanner = ref(false);
const showPairingCode = ref(false);
const qrCodeUrl = ref('');


const localStats = computed(() => {
    const accountStore = useAccountStore();
    const transactionStore = useTransactionStore();
    const categoryStore = useCategoryStore();
    const projectStore = useProjectStore();
    return {
        accounts: accountStore.accounts.length,
        transactions: transactionStore.transactions.length,
        categories: categoryStore.categories.length,
        projects: projectStore.projects.length
    };
});

const syncStats = ref({ accounts: 0, transactions: 0, categories: 0, projects: 0 });

const fileInput = ref<HTMLInputElement | null>(null);
const { copy } = useClipboard();

const isGroupIdChanged = computed(() => groupId.value !== savedGroupId.value);

async function updateSyncStats() {
    try {
        const { getAppState } = await import('~/sync/manager');
        const state = await getAppState();
        syncStats.value = {
            accounts: Object.keys(state.accounts).length,
            transactions: Object.keys(state.transactions).length,
            categories: Object.keys(state.categories).length,
            projects: Object.keys(state.projects).length
        };
        console.log('Sync stats updated.');
    } catch (e) {
        console.error('Failed to fetch sync stats', e);
    }
}

onMounted(async () => {
    deviceId.value = await getDeviceId();
    const storedMnemonic = localStorage.getItem('ocm-mnemonic');
    if (storedMnemonic) {
        groupId.value = storedMnemonic;
        savedGroupId.value = storedMnemonic;
    }
    // Do NOT set default anymore
    await updateSyncStats();
});

// Watch input to update QR code dynamically
watch(groupId, async (val) => {
    if (val) {
        try {
            qrCodeUrl.value = await QRCode.toDataURL(val);
        } catch (e) {
            console.error(e);
        }
    } else {
        qrCodeUrl.value = '';
    }
});

function generateRandomCode() {
    // Generate 12-word mnemonic
    const mnemonic = generateMnemonic();
    groupId.value = mnemonic;
    log('Generated new random code.');
}

async function onScan(decodedText: object[]) {
    // vue-qrcode-reader emits array of objects: [{ rawValue: '...' }, ...]
    const result = decodedText[0] as { rawValue: string };
    if (result && result.rawValue) {
        groupId.value = result.rawValue;
        showScanner.value = false;
        log('QR Code scanned successfully.');
        // Optionally auto-save? Let user review first.
    }
}

function log(msg: string) {
    logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

async function copyDeviceId() {
    await copy(deviceId.value);
    log('Device ID copied to clipboard');
}

async function saveGroupId() {
    if (!groupId.value) return;

    // 1. Save valid mnemonic (private key)
    localStorage.setItem('ocm-mnemonic', groupId.value);

    // 2. Derive and save Group ID (public identifier)
    const gid = await deriveGroupId(groupId.value);
    localStorage.setItem('ocm-sync-group-id', gid);

    savedGroupId.value = groupId.value; // Show the mnemonic in UI
    log('Pairing code saved. Sync enabled.');

    // Trigger an initial sync immediately
    handleSync();
}

function resetGroupId() {
    if (!confirm('This will stop synchronization on this device. Local data is preserved. Continue?')) return;
    localStorage.removeItem('ocm-sync-group-id');
    localStorage.removeItem('ocm-mnemonic');
    savedGroupId.value = '';
    groupId.value = '';
    log('Sync disconnected.');
}

async function handleSync() {
    isSyncing.value = true;
    try {
        log('Starting sync...');
        await syncWithServer();
        lastSyncTime.value = new Date().toLocaleString();
        log('Sync completed successfully.');

        await hydratePinia();
        await updateSyncStats();

    } catch (e) {
        console.error(e);
        log(`Sync failed: ${String(e)}`);
    } finally {
        isSyncing.value = false;
    }
}

async function handleMigration() {
    if (!confirm('This will upload all your local data to the sync server. Continue?')) return;

    isMigrating.value = true;
    log('Starting migration...');
    const accountStore = useAccountStore();
    const transactionStore = useTransactionStore();
    const categoryStore = useCategoryStore();
    const projectStore = useProjectStore();

    try {
        // Collect data
        const accounts = JSON.parse(JSON.stringify(accountStore.accounts));
        const transactions = JSON.parse(JSON.stringify(transactionStore.$state.transactions));
        const categories = JSON.parse(JSON.stringify(categoryStore.categories));
        const projects = JSON.parse(JSON.stringify(projectStore.projects));

        const count = accounts.length + transactions.length + categories.length + projects.length;

        await importLocalData({
            accounts,
            transactions,
            categories,
            projects
        });

        log(`Migrated ${count} items to event log.`);

        // Trigger sync to push
        await handleSync();
        await updateSyncStats();

    } catch (e) {
        console.error(e);
        log(`Migration failed: ${String(e)}`);
    } finally {
        isMigrating.value = false;
    }
}

async function handleRestoreBackup(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!confirm('This will restore data from the backup file. It will be merged into the current state. Continue?')) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const content = e.target?.result as string;
            const backup = JSON.parse(content);

            // Check format (basic check)
            if (!backup.accounts || !backup.transactions) {
                log('Invalid backup format. Expected { accounts, transactions }');
                return;
            }

            // Restore to Event Log directly, then hydrate
            log('Restoring backup to event log...');

            const accounts = backup.accounts ? JSON.parse(JSON.stringify(backup.accounts)) : [];
            const transactions = backup.transactions ? JSON.parse(JSON.stringify(backup.transactions)) : [];
            const categories = backup.categories ? JSON.parse(JSON.stringify(backup.categories)) : [];
            const projects = backup.projects ? JSON.parse(JSON.stringify(backup.projects)) : [];

            const count = accounts.length + transactions.length + categories.length + projects.length;

            await importLocalData({
                accounts,
                transactions,
                categories,
                projects
            });

            log(`Restored ${count} items from backup.`);
            await handleSync(); // Push to server + Hydrate UI

        } catch (err) {
            console.error(err);
            log(`Restore failed: ${err}`);
        } finally {
            // Reset input
            (event.target as HTMLInputElement).value = '';
        }
    };
    reader.readAsText(file);
}


</script>
