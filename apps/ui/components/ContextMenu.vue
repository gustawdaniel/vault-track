<script lang="ts" setup>
import { useDialog } from '~/store/dialog';
import ConfirmDelete from '~/components/dialog/ConfirmDelete.vue';

const { x, y } = useMouse();
const { y: windowY } = useWindowScroll();
const isOpen = ref(false);
const virtualElement = ref({ getBoundingClientRect: () => ({}) });

function onContextMenu() {
  const top = unref(y) - unref(windowY);
  const left = unref(x);
  virtualElement.value.getBoundingClientRect = () => ({
    width: 0,
    height: 0,
    top,
    left,
  });
  isOpen.value = true;
}

const hover = ref<number>(-1);

interface MenuOption {
  id: string;
  name: string;
  click: () => void;
}

export type ContextualResource = 'account' | 'transaction';

const props = defineProps<{
  resource: ContextualResource;
  id: string;
}>();

const options = computed<MenuOption[]>(() => {
  // todo add account context
  if (props.resource === 'account') throw new Error('Not implemented');

  return [
    // TODO: add edit
    // {
    //   id: 'edit',
    //   name: 'Edit transaction',
    //   click: () => {
    //     isOpen.value = false;
    //   },
    // },
    {
      id: 'delete',
      name: 'Delete transaction',
      click: () => {
        const dialog = useDialog();
        dialog.openDialog(ConfirmDelete, {
          resource: props.resource,
          id: props.id,
        });

        isOpen.value = false;
      },
    },
    // TODO: add copy
    // {
    //   id: 'copy',
    //   name: 'Copy transaction',
    //   click: () => {
    //     isOpen.value = false;
    //   },
    // },
    //   TODO: add schedule
    // {
    //   id: 'schedule',
    //   name: 'Create schedule',
    //   click: () => {
    //     isOpen.value = false;
    //   },
    // },
  ];
});
</script>

<template>
  <div @contextmenu.prevent="onContextMenu">
    <UContextMenu v-model="isOpen" :virtual-element="virtualElement">
      <div
        class="w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        <div
          v-for="(item, index) in options"
          :key="index"
          @mouseenter="hover = index"
          @mouseleave="hover = -1"
        >
          <a
            :class="[
              hover === index ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
              'block px-4 py-2 text-sm cursor-pointer',
            ]"
            @click="item.click"
            >{{ item.name }}</a
          >
        </div>
      </div>
    </UContextMenu>

    <slot />
  </div>
</template>

<style scoped></style>
