<script lang="ts" setup>
import { useCategoryStore } from '~/store/category';

const categoryStore = useCategoryStore();
</script>

<template>
  <div class="text-xs">
    <ul>
      <li
        v-for="category of categoryStore.categories"
        :key="category.category"
        class="flex items-center"
      >
        <div :style="{ backgroundColor: category.color }" class="h-3 w-3"></div>
        <span>{{ category }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped></style>
