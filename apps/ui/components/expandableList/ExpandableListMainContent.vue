<script lang="ts" setup>
import { type CategoryTree, useCategoryStore } from '~/store/category';
import { type ProjectTree, useProjectStore } from '~/store/project';
import type { ExpandableListResourceName } from '~/components/expandableList/types';
import CategoryColorBox from '~/components/transactions/CategoryColorBox.vue';
import ContextMenu from '~/components/menu/ContextMenu.vue';
import { getNameFromExtendableListItem } from '~/utils/getNameFromExtendableListItem';

const categoryStore = useCategoryStore();
const projectStore = useProjectStore();

const props = defineProps<{
  resource: ExpandableListResourceName;
}>();

const tree = computed<CategoryTree | ProjectTree>(() => {
  switch (props.resource) {
    case 'category':
      return categoryStore.tree;
    case 'project':
      return projectStore.tree;
  }
});



function getName(item: { category: string } | { project: string }): string {
  return getNameFromExtendableListItem(props.resource, item);
}
</script>

<template>
  <Debug v-if="resource === 'project'">{{ projectStore.projects }}</Debug>
  <Debug v-if="resource === 'category'">{{ categoryStore.categories }}</Debug>
  <Debug>{{ tree }}</Debug>

  <nav aria-label="Sidebar" class="flex flex-1 flex-col">
    <ul class="-mx-2 space-y-1" role="list">
      <ExpandableListItem
        v-for="item in tree"
        :key="item.id"
        :item="item"
        :resource="resource"
      />
    </ul>
  </nav>
</template>

<style scoped></style>
