<script lang="ts" setup>
import {
  ColoredCategory,
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
  <UFormGroup label="Category" name="category">
    <USelectMenu
      :model-value="getFullCategoryName({ category: props.modelValue })"
      :options="options"
      by="category"
      creatable
      option-attribute="category"
      searchable
      value-attribute="category"
      @update:model-value="setCategory"
    >
      <template #label>
        <template v-if="props.modelValue">
          <span class="flex items-center -space-x-1 h-5">
            <span
              :style="{
                background: `${categoryStore.getColorByCategory(
                  props.modelValue,
                )}`,
              }"
              class="flex-shrink-0 w-2 h-2 mt-px rounded-full"
            />
          </span>
          <span>{{ getFullCategoryName({ category: props.modelValue }) }}</span>
        </template>
        <template v-else>
          <span class="text-gray-500 dark:text-gray-400 truncate">
            Select category
          </span>
        </template>
      </template>
      <template #option="{ option }">
        <span
          :style="{ background: `${option.color}` }"
          class="flex-shrink-0 w-2 h-2 mt-px rounded-full"
        />
        <span class="truncate">{{ option.category }}</span>
      </template>
      <template #option-create="{ option }">
        <span class="flex-shrink-0">New category:</span>
        <span
          :style="{
            background: `${getRandomColor()}`,
          }"
          class="flex-shrink-0 w-2 h-2 mt-px rounded-full -mx-1"
        />
        <span class="block truncate">{{ option.category }}</span>
      </template>
    </USelectMenu>
  </UFormGroup>
</template>

<style scoped></style>
