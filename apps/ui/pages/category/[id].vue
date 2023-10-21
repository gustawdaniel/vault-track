<script lang="ts" setup>
import { useCategoryStore } from '~/store/category';
import { useRoute } from '#imports';
import SingleCategoryEdit from '~/components/category/SingleCategoryEdit.vue';

const NEW_CATEGORY_ID = 'new';
const route = useRoute();
const categoryId: string = String(route.params.id);
const categoryStore = useCategoryStore();
const category =
  categoryId === NEW_CATEGORY_ID
    ? categoryStore.getNew()
    : categoryStore.getById(categoryId);
</script>

<template>
  <div v-if="category">
    <SingleCategoryEdit :category="category" />
  </div>
  <div v-else>
    <p>Category {{ categoryId }} not found</p>
  </div>
</template>
