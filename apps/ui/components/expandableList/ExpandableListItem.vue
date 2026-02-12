<script lang="ts" setup>
import { type CategoryTree, useCategoryStore } from '~/store/category';
import { type ProjectTree, type PersistedProject } from '~/store/project';
import type { ExpandableListResourceName } from '~/components/expandableList/types';
import CategoryColorBox from '~/components/transactions/CategoryColorBox.vue';
import ContextMenu from '~/components/menu/ContextMenu.vue';
import { getNameFromExtendableListItem } from '~/utils/getNameFromExtendableListItem';
import draggable from 'vuedraggable';

const props = defineProps<{
  item: CategoryTree[number] | ProjectTree[number] | PersistedProject;
  resource: ExpandableListResourceName;
  depth?: number;
}>();

const currentDepth = computed(() => props.depth ?? 0);

function getName(item: any): string {
  return getNameFromExtendableListItem(props.resource, item);
}

const categoryStore = useCategoryStore();

const children = computed({
  get: () => {
    if ('children' in props.item) {
      return props.item.children;
    }
    return [];
  },
  set: (value) => {
    if (props.resource === 'category') {
      // Reording children of this item
      // But reorder action updates the *entire* tree or sub-tree?
      // My store action 'reorder' takes a list and updates order of each item in it.
      // So passing 'children' here is correct.
      categoryStore.reorder(value as CategoryTree);
    }
  }
});
</script>

<template>
  <li class="block">
    <ContextMenu :id="item.id" :resource="resource">
      <NuxtLink
        :to="`/${resource}/${item.id}`"
        :class="[
          'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
          'group flex gap-x-3 rounded-md p-1 pl-3 text-sm leading-6 font-semibold',
          'items-center cursor-pointer',
        ]"
        :style="{ marginLeft: `${currentDepth * 1.5}rem` }"
      >
        <CategoryColorBox
          v-if="'color' in item"
          :color="item.color"
          :extended="false"
        />
        <span>{{ getName(item) }}</span>
      </NuxtLink>
    </ContextMenu>

    <draggable
      v-if="children.length > 0"
      v-model="children"
      tag="ul"
      item-key="id"
      class="space-y-0.5"
      group="categories"
      :disabled="resource !== 'category'"
    >
      <template #item="{ element: child }">
        <ExpandableListItem
          :key="child.id"
          :item="child"
          :resource="resource"
          :depth="currentDepth + 1"
        />
      </template>
    </draggable>
  </li>
</template>

<style scoped></style>
