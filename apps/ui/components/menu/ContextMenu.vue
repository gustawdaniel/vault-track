<script lang="ts" setup>
import { uid } from 'uid';
import { string } from 'zod';
import { useDialog } from '~/store/dialog';
import ConfirmDelete from '~/components/dialog/ConfirmDelete.vue';
import HoveredSelectableOptionsList, {
  MenuOption,
} from '~/components/menu/HoveredSelectableOptionsList.vue';
import { useContextMenuStore } from '~/store/contextMenu';

const contextMenuStore = useContextMenuStore();

const { x, y } = useMouse();
const { y: windowY } = useWindowScroll();

const virtualElement = ref({ getBoundingClientRect: () => ({}) });

const contextMenuId = ref<string>(uid());

function onContextMenu() {
  const top = unref(y) - unref(windowY);
  const left = unref(x);
  virtualElement.value.getBoundingClientRect = () => ({
    width: 0,
    height: 0,
    top,
    left,
  });

  contextMenuStore.setId(contextMenuId.value);
}

const isOpen = computed<boolean>(() => {
  return contextMenuStore.id === contextMenuId.value;
});

// ok
function setId(isOpen: boolean) {
  if (!isOpen) {
    contextMenuStore.close();
  }
}

export type ContextualResource = 'account' | 'transaction' | 'category';

const props = defineProps<{
  resource: ContextualResource;
  id: string;
}>();

const options = computed<MenuOption[]>(() => {
  switch (props.resource) {
    case 'category':
      return [
        {
          id: 'edit',
          name: 'Edit category',
          click: () => {
            contextMenuStore.close();
            const router = useRouter();
            router.push(`/category/${props.id}`);
          },
        },
        {
          id: 'delete',
          name: 'Delete account',
          click: () => {
            const dialog = useDialog();
            dialog.openDialog(ConfirmDelete, {
              resource: props.resource,
              id: props.id,
            });

            contextMenuStore.close();
          },
        },
      ];
    case 'account':
      return [
        {
          id: 'edit',
          name: 'Edit account',
          click: () => {
            contextMenuStore.close();
            const router = useRouter();
            router.push(`/account/${props.id}?edit=1`);
          },
        },
        {
          id: 'delete',
          name: 'Delete account',
          click: () => {
            const dialog = useDialog();
            dialog.openDialog(ConfirmDelete, {
              resource: props.resource,
              id: props.id,
            });

            contextMenuStore.close();
          },
        },
        // TODO: add Show closed/hidden
        // {
        //   id: 'show-hide',
        //   name: 'Show closed/hidden',
        //   click: () => {
        //                 contextMenuStore.close();
        //   },
        // },
      ];
    case 'transaction':
      return [
        // TODO: add edit
        // {
        //   id: 'edit',
        //   name: 'Edit transaction',
        //   click: () => {
        //                 contextMenuStore.close();
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

            contextMenuStore.close();
          },
        },
        // TODO: add copy
        // {
        //   id: 'copy',
        //   name: 'Copy transaction',
        //   click: () => {
        //                 contextMenuStore.close();
        //   },
        // },
        //   TODO: add schedule
        // {
        //   id: 'schedule',
        //   name: 'Create schedule',
        //   click: () => {
        //                 contextMenuStore.close();
        //   },
        // },
      ];
  }
});
</script>

<template>
  <div @contextmenu.prevent="onContextMenu">
    <UContextMenu
      :model-value="isOpen"
      :virtual-element="virtualElement"
      @update:model-value="setId"
    >
      <HoveredSelectableOptionsList :options="options" />
    </UContextMenu>

    <slot />
  </div>
</template>

<style scoped></style>
