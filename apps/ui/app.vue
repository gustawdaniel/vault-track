<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <dialog-root />
    <UNotifications />
  </div>
</template>

<script lang="ts" setup>
import { useDebugStore } from '~/store/debug';

function notOurDomain(origin: string): boolean {
  return !['http://localhost:3000', 'https://gustawdaniel.github.io'].includes(
    origin,
  );
}

// remove dark mode
definePageMeta({
  colorMode: 'light',
});

// https://color-mode.nuxtjs.org/
const mode = useLocalStorage('nuxt-color-mode', 'light');
if (mode.value === 'dark') {
  mode.value = undefined;
}

// activation of debug by postMessage({'debug': true / false})
window.addEventListener(
  'message',
  (event) => {
    if (notOurDomain(event.origin)) return;

    if ('debug' in event.data && typeof event.data.debug === 'boolean') {
      const debugStore = useDebugStore();
      debugStore.active = event.data.debug;
    }
  },
  false,
);
</script>
