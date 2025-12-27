<script setup lang="ts">
const items = ref(['Backlog', 'Todo', 'In Progress', 'Done'])
const value = ref('Backlog')
</script>

<template>
  <div class="p-4">
    <USelectMenu v-model="value" :items="items" />
    <p>Selected: {{ value }}</p>
  </div>
</template>
