<script lang="ts" setup>
import { type CategoryTree } from '~/store/category';
import { type ProjectTree, type PersistedProject } from '~/store/project';
import type { ExpandableListResourceName } from '~/components/expandableList/types';
import CategoryColorBox from '~/components/transactions/CategoryColorBox.vue';
import ContextMenu from '~/components/menu/ContextMenu.vue';
import { getNameFromExtendableListItem } from '~/utils/getNameFromExtendableListItem';

const props = defineProps<{
  item: CategoryTree[number] | ProjectTree[number] | PersistedProject;
  resource: ExpandableListResourceName;
  depth?: number;
}>();

const currentDepth = computed(() => props.depth ?? 0);

function getName(item: any): string {
  return getNameFromExtendableListItem(props.resource, item);
}
</script>

<template>
  <li>
    <ContextMenu :id="item.id" :resource="resource">
      <NuxtLink
        :to="`/${resource}/${item.id}`"
        :class="[
          'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
          'group flex gap-x-3 rounded-md p-1 pl-3 text-sm leading-6 font-semibold',
          'items-center cursor-pointer',
        ]"
        :style="{ marginLeft: `${currentDepth * 2.5}rem` }"
      >
        <CategoryColorBox
          v-if="'color' in item"
          :color="item.color"
          :extended="false"
        />
        <span>{{ getName(item) }}</span>
      </NuxtLink>
    </ContextMenu>
  </li>

  <template v-if="'children' in item && item.children && item.children.length > 0">
    <ExpandableListItem
      v-for="child in item.children"
      :key="child.id"
      :item="child"
      :resource="resource"
      :depth="currentDepth + 1"
    />
  </template>
</template>

<style scoped></style>
