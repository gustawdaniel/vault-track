import { defineStore } from 'pinia';
import { deriveGroupId } from '~/sync/crypto';
import { syncWithServer } from '~/sync/client';

export const useSyncStore = defineStore('sync', () => {
    const isSyncing = ref(false);
    const lastSyncTime = ref<number | null>(null);
    const groupId = ref<string | null>(null);
    const mnemonic = ref<string | null>(null);

    async function init() {
        if (import.meta.client) {
            const stored = localStorage.getItem('ocm-mnemonic');
            if (stored) {
                mnemonic.value = stored;
                groupId.value = await deriveGroupId(stored);
            }
        }
    }

    async function setMnemonic(phrase: string) {
        phrase = phrase.trim();
        if (!phrase) return;

        localStorage.setItem('ocm-mnemonic', phrase);
        mnemonic.value = phrase;
        const gid = await deriveGroupId(phrase);
        localStorage.setItem('ocm-sync-group-id', gid);
        groupId.value = gid;
        // Kick off an immediate sync now that we have a group ID.
        void triggerSync(true);
    }

    async function clear() {
        localStorage.removeItem('ocm-mnemonic');
        localStorage.removeItem('ocm-sync-group-id');
        mnemonic.value = null;
        groupId.value = null;
    }

    async function triggerSync(force = false) {
        if (isSyncing.value && !force) return;

        isSyncing.value = true;
        try {
            const state = await syncWithServer();
            lastSyncTime.value = Date.now();
            if (state) {
                const { hydratePinia } = await import('~/sync/hydration');
                await hydratePinia();
            }
        } catch (e) {
            console.error('Sync trigger failed', e);
        } finally {
            isSyncing.value = false;
        }
    }

    return {
        isSyncing,
        lastSyncTime,
        groupId,
        mnemonic,
        init,
        setMnemonic,
        clear,
        triggerSync
    };
});

