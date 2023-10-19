<script lang="ts" setup>
import { useDialog } from '~/store/dialog';
import ConfirmDelete from '~/components/dialog/ConfirmDelete.vue';
import HoveredSelectableOptionsList, {
  MenuOption,
} from '~/components/menu/HoveredSelectableOptionsList.vue';

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

export type ContextualResource = 'account' | 'transaction';

const props = defineProps<{
  resource: ContextualResource;
  id: string;
}>();

const options = computed<MenuOption[]>(() => {
  switch (props.resource) {
    case 'account':
      return [
        {
          id: 'edit',
          name: 'Edit account',
          click: () => {
            isOpen.value = false;
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

            isOpen.value = false;
          },
        },
        // TODO: add Show closed/hidden
        // {
        //   id: 'show-hide',
        //   name: 'Show closed/hidden',
        //   click: () => {
        //     isOpen.value = false;
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
  }
});
</script>

<template>
  <div @contextmenu.prevent="onContextMenu">
    <UContextMenu v-model="isOpen" :virtual-element="virtualElement">
      <HoveredSelectableOptionsList :options="options" />
    </UContextMenu>

    <slot />
  </div>
</template>

<style scoped></style>
