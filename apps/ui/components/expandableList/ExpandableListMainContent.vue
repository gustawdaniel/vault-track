<script lang="ts" setup>
import { CategoryTree, useCategoryStore } from '~/store/category';
import { ProjectTree, useProjectStore } from '~/store/project';
import { ExpandableListResourceName } from '~/components/expandableList/types';
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

function redirectToItem(id: string) {
  const router = useRouter();
  router.push(`/${props.resource}/${id}`);
}

function getName(item: { category: string } | { project: string }): string {
  return getNameFromExtendableListItem(props.resource, item);
}
</script>

<template>
  <Debug>{{ projectStore.projects }}</Debug>
  <!--  <pre>{{ tree }}</pre>-->

  <nav aria-label="Sidebar" class="flex flex-1 flex-col">
    <ul class="-mx-2 space-y-1" role="list">
      <template v-for="item in tree" :key="getName(item)">
        <li @click="redirectToItem(item.id)">
          <ContextMenu
            :id="item.id"
            :class="[
              'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
              'group flex gap-x-3 rounded-md p-2 pl-3 text-sm leading-6 font-semibold',
              'items-center  cursor-pointer',
            ]"
            :resource="resource"
          >
            <CategoryColorBox
              v-if="'color' in item"
              :color="item.color"
              :extended="false"
            />
            <span>{{ getName(item) }}</span>
          </ContextMenu>
        </li>

        <li
          v-for="children in item.children"
          :key="getName(children)"
          @click="redirectToItem(children.id)"
        >
          <ContextMenu
            :id="children.id"
            :class="[
              'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
              'group flex gap-x-3 rounded-md p-2 pl-3 text-sm leading-6 font-semibold',
              'ml-10 items-center cursor-pointer',
            ]"
            :resource="resource"
          >
            <CategoryColorBox
              v-if="'color' in children"
              :color="children.color"
              :extended="false"
            />
            <span>{{ getName(children) }}</span>
          </ContextMenu>
        </li>
      </template>
    </ul>
  </nav>
</template>

<style scoped></style>
