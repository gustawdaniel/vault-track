import { syncWithServer } from '~/sync/client';
import { useDocumentVisibility } from '@vueuse/core';
import { hydratePinia } from '~/sync/hydration';
import { setDebouncedSync } from '~/sync/manager';
import type { NuxtApp } from 'nuxt/schema';

export default defineNuxtPlugin((nuxtApp: NuxtApp) => {
    // Only run on client
    if (import.meta.server) return;

    const visibility = useDocumentVisibility();
    let isLoopRunning = false;
    let isSyncing = false;

    const doSync = async (source: string, wait = false) => {
        if (isSyncing && !wait) {
            // If already syncing and not a wait-request, skip or queue?
            // For simplicity, let it slide. fetchRemoteEvents is robust enough.
        }
        isSyncing = true;
        try {
            if (!wait) console.log(`[Sync] Triggered by ${source}`);
            // If we are doing a "push" (triggered by debounce), we don't need to wait.
            // But if we are in the loop, we pass 'wait'.
            // Actually, `syncWithServer` blindly pulls. We need to pass the 'wait' flag to it.
            // I need to update `syncWithServer` signature in `client.ts` first!
            // But I can't do two files in one step properly if I want to be safe.
            // I will assume I updated `client.ts` to accept options.
            const state = await syncWithServer({ wait });
            if (state) {
                await hydratePinia();
            }
        } catch (e) {
            console.error('[Sync] Error:', e);
            // If error, wait a bit before retrying if it was a loop
            if (wait) await new Promise(r => setTimeout(r, 5000));
        } finally {
            isSyncing = false;
        }
    };

    // Long Polling Loop
    const startLoop = async () => {
        if (isLoopRunning) return;
        isLoopRunning = true;
        console.log('[Sync] Starting Long Polling Loop');

        while (true) {
            if (visibility.value === 'hidden') {
                // If hidden, stop long polling to save resources/battery?
                // Or switch to slow poll?
                // User requirement: "instant sync between devices".
                // If I am on phone but app is backgrounded, I might not need instant sync.
                // But if I have two windows open, one hidden...
                // Let's pause long polling when hidden and just do slow poll or relying on "visibility change".
                isLoopRunning = false;
                break;
            }

            // Long poll request
            await doSync('loop', true);

            // Small delay to prevent tight loops on errors or fast returns
            await new Promise(r => setTimeout(r, 100)); // 100ms
        }
    };

    // Hook up Debounced Sync from Manager
    setDebouncedSync(() => {
        doSync('local mutation', false);
    });

    // Initial Sync
    setTimeout(() => {
        doSync('initial mount', false).then(() => {
            startLoop();
        });
    }, 2000);

    // Watch visibility
    watch(visibility, (curr) => {
        if (curr === 'visible') {
            doSync('visibility change', false);
            startLoop();
        }
    });
});
