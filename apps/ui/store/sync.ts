import { defineStore } from 'pinia';
import { deriveKey } from '~/sync/crypto';
import { syncWithServer } from '~/sync/client';

export const useSyncStore = defineStore('sync', () => {
    const isSyncing = ref(false);
    const lastSyncTime = ref<number | null>(null);
    const encryptionKey = ref<CryptoKey | null>(null);
    const mnemonic = ref<string | null>(null);

    // Initialize key from local storage on mount
    async function init() {
        if (import.meta.client) {
            const stored = localStorage.getItem('ocm-mnemonic');
            if (stored) {
                mnemonic.value = stored;
                try {
                    encryptionKey.value = await deriveKey(stored);
                } catch (e) {
                    console.error('Failed to derive key from stored mnemonic', e);
                }
            }
        }
    }

    async function setMnemonic(phrase: string) {
        phrase = phrase.trim();
        if (!phrase) return;

        localStorage.setItem('ocm-mnemonic', phrase);
        mnemonic.value = phrase;
        encryptionKey.value = await deriveKey(phrase);
    }

    async function clear() {
        localStorage.removeItem('ocm-mnemonic');
        mnemonic.value = null;
        encryptionKey.value = null;
    }

    async function triggerSync(force = false) {
        if (isSyncing.value && !force) return;

        isSyncing.value = true;
        try {
            // We don't pass key here, client.ts reads from localStorage internally
            // BUT ideally client.ts should accept key as param to avoid reading LS every time.
            // For now, client.ts reads LS. Improvements typical for future refactor.
            await syncWithServer();
            lastSyncTime.value = Date.now();
        } catch (e) {
            console.error('Sync trigger failed', e);
        } finally {
            isSyncing.value = false;
        }
    }

    return {
        isSyncing,
        lastSyncTime,
        encryptionKey,
        mnemonic,
        init,
        setMnemonic,
        clear,
        triggerSync
    };
});
