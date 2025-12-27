<script lang="ts" setup>
const hover = ref<number>(-1);

interface MenuOption {
  id: string;
  name: string;
  click: () => void;
}

const options: MenuOption[] = [
  // TODO: add edit
  // {
  //   id: 'edit',
  //   name: 'Edit transaction',
  //   click: () => {
  //   },
  // },
  {
    id: 'delete',
    name: 'Delete transaction',
    click: () => {
      // Logic for delete
    },
  },
  // TODO: add copy
  // {
  //   id: 'copy',
  //   name: 'Copy transaction',
  //   click: () => {
  //   },
  // },
  //   TODO: add schedule
  // {
  //   id: 'schedule',
  //   name: 'Create schedule',
  //   click: () => {
  //   },
  // },
];

const menuItems = computed(() => [
  options.map((o) => ({
    label: o.name,
    onSelect: o.click,
  }))
]);
</script>

<template>
  <UContextMenu
    :items="menuItems"
    :ui="{
      content: 'min-w-48 bg-white dark:bg-gray-900 shadow-xl ring-1 ring-gray-200 dark:ring-gray-800 rounded-lg overflow-hidden'
    }"
  >
    <div class="bg-teal-200 w-full h-20">
      <!-- Content here -->
    </div>
  </UContextMenu>
</template>

<style scoped></style>
