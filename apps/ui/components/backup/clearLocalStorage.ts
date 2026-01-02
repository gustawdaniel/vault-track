import { useLocalStorage } from '@vueuse/core';
import { nextTick } from 'vue';
import { clearEvents } from '~/sync/db';
import { clearMeta } from '~/sync/meta';

export async function clearLocalStorage() {
  for (const key of ['account', 'category', 'transaction', 'project']) {
    const ls = useLocalStorage(key, []);
    ls.value = [];
    await nextTick();
  }

  // Clear IndexedDB
  await Promise.all([
    clearEvents(),
    clearMeta(),
  ]);

  // Clear Sync ID
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('ocm-sync-group-id');
  }
}
