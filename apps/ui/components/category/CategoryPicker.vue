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
const emit = defineEmits(['update:modelValue']);

const options = computed<Array<ColoredCategory>>(() => {
  return [
    ...categoryStore.categories,
    { category: NO_CATEGORY, color: 'transparent' },
  ];
});

const selected = computed({
  get() {
    if (!props.modelValue) return undefined;
    if (props.modelValue === NO_CATEGORY) return options.value.find(o => o.category === NO_CATEGORY);
    return options.value.find((c) => c.category === props.modelValue);
  },
  set(value: string | ColoredCategory | undefined) {
    if (typeof value === 'object' && value !== null) {
      if (value.category === NO_CATEGORY) {
        emit('update:modelValue', '');
      } else {
        emit('update:modelValue', value.category);
      }
    } else if (typeof value === 'string') {
      // Handle "creatable" input which renders as string initially or via create-option
      emit('update:modelValue', value);
    }
  },
});

function onCreate(option: string | ColoredCategory) {
  const categoryName = typeof option === 'string' ? option : option.category;
  if (categoryName) {
    categoryStore.create({ category: categoryName });
    emit('update:modelValue', categoryName);
  }
}
</script>

<template>
  <UFormField label="Category" name="category" class="w-full">
    <USelectMenu v-model="selected" :items="options" by="category" create-item label-key="category" class="w-full"
      @create="onCreate">
      <template #item-label="{ item }">
        <span class="flex items-center -space-x-1 h-5">
          <span :style="{
            background: `${item.color || 'transparent'}`,
          }" class="flex-shrink-0 w-2 h-2 mt-px rounded-full" />
        </span>
        <span class="truncate">{{ getFullCategoryName({ category: item.category }) }}</span>
      </template>

      <template #item="{ item }">
        <span :style="{ background: `${item.color}` }" class="flex-shrink-0 w-2 h-2 mt-px rounded-full" />
        <span class="truncate">{{ item.category }}</span>
      </template>
    </USelectMenu>
  </UFormField>
</template>

<style scoped></style>
