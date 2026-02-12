<script lang="ts" setup>
import { useCategoryStore } from '~/store/category';
import { useRoute } from '#imports';
import SingleCategoryEdit from '~/components/category/SingleCategoryEdit.vue';

const NEW_CATEGORY_ID = 'new';
const route = useRoute();
const categoryId: string = String(route.params.id);
const categoryStore = useCategoryStore();

const getInitialCategory = () => {
  if (categoryId === NEW_CATEGORY_ID) {
    const parentId = route.query.parent as string | undefined;
    const newCat = categoryStore.getNew();
    if (parentId) {
      const parentCategory = categoryStore.getById(parentId);
      if (parentCategory) {
        newCat.category = `${parentCategory.category}:`;
      }
    }
    return newCat;
  }
  return categoryStore.getById(categoryId);
};

const category = getInitialCategory();
</script>

<template>
  <div v-if="category">
    <SingleCategoryEdit :category="category" />
  </div>
  <div v-else>
    <p>Category {{ categoryId }} not found</p>
  </div>
</template>
