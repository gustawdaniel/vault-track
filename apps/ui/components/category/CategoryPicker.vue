<script lang="ts" setup>
import {
  type ColoredCategory,
  getFullCategoryName,
  useCategoryStore,
} from '~/store/category';
import { getRandomColor } from '~/utils/getRandomColor';

const categoryStore = useCategoryStore();
const NO_CATEGORY = 'No Category';

const props = defineProps<{
  modelValue: string | undefined;
}>();
const emit = defineEmits(['update:model-value']);

function setCategory(
  value:
    | string
    | {
      category: string;
    },
): void {
  if (typeof value === 'string') {
    if (value === NO_CATEGORY) value = '';
    // update
    emit('update:model-value', value);
  } else {
    // create new
    const newCategoryName = value.category;
    categoryStore.create({ category: newCategoryName });
    emit('update:model-value', newCategoryName);
  }
}

const options = computed<Array<ColoredCategory>>(() => {
  return [
    ...categoryStore.categories,
    { category: NO_CATEGORY, color: 'transparent' },
  ];
});
</script>

<template>
  <UFormField label="Category" name="category" class="w-full">
    <USelectMenu :model-value="getFullCategoryName({ category: props.modelValue })" :items="options" by="category"
      creatable option-attribute="category" searchable value-attribute="category" @update:model-value="setCategory"
      class="w-full">
      <template #item-label="{ item }">
        <template v-if="props.modelValue">
          <span class="flex items-center -space-x-1 h-5">
            <span :style="{
              background: `${categoryStore.getColorByCategory(
                props.modelValue,
              )}`,
            }" class="flex-shrink-0 w-2 h-2 mt-px rounded-full" />
          </span>
          <span>{{ getFullCategoryName({ category: item.category }) }}</span>
        </template>
        <template v-else>
          <span class="text-gray-500 dark:text-gray-400 truncate">
            Select category
          </span>
        </template>
      </template>
      <template #item="{ item }">
        <span :style="{ background: `${item.color}` }" class="flex-shrink-0 w-2 h-2 mt-px rounded-full" />
        <span class="truncate">{{ item.category }}</span>
      </template>
      <template #option-create="{ option }">
        <span class="flex-shrink-0">New category:</span>
        <span :style="{
          background: `${getRandomColor()}`,
        }" class="flex-shrink-0 w-2 h-2 mt-px rounded-full -mx-1" />
        <span class="block truncate">{{ option.category }}</span>
      </template>
    </USelectMenu>
  </UFormField>
</template>

<style scoped></style>
