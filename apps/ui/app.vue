<template>
  <div>
    <dialog-root />
    <NuxtPage />
  </div>
</template>

<script lang="ts" setup>
import { useDebugStore } from '~/store/debug';

function notOurDomain(origin: string): boolean {
  return !['http://localhost:3000', 'https://gustawdaniel.github.io'].includes(
    origin,
  );
}

// activation of debug by postMessage({'debug': true / false})
window.addEventListener(
  'message',
  (event) => {
    console.log(event);
    if (notOurDomain(event.origin)) return;

    if ('debug' in event.data && typeof event.data.debug === 'boolean') {
      const debugStore = useDebugStore();
      debugStore.active = event.data.debug;
    }
  },
  false,
);
</script>
