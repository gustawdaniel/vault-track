<script lang="ts" setup>
import { useDebugStore } from '~/store/debug';

const debugStore = useDebugStore();

defineProps<{ root?: 'div' }>();
</script>

<template>
  <component
    :is="root ?? 'pre'"
    v-if="debugStore.active"
    class="text-green-700"
  >
    <slot />
  </component>
</template>

<style scoped></style>
