<script lang="ts" setup>
import { useCategoryStore } from '~/store/category';

const categoryStore = useCategoryStore();
</script>

<template>
  <div class="text-xs">
    <ul>
      <li v-for="category of categoryStore.categories" :key="category.category">
        {{ category }}
      </li>
    </ul>
  </div>
</template>

<style scoped></style>
