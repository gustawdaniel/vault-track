<script lang="ts" setup>
const props = defineProps<{ color: string; extended: boolean }>();
</script>

<template>
  <div
    :class="{ 'h-10': props.extended, 'h-8': !props.extended }"
    :style="{ backgroundColor: props.color }"
    class="w-2 border"
  />
</template>

<style scoped></style>
