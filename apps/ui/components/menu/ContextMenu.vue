<script lang="ts" setup>
import { useDialog } from '~/store/dialog';
import ConfirmDelete from '~/components/dialog/ConfirmDelete.vue';
// import { useContextMenuStore } from '~/store/contextMenu';

// const contextMenuStore = useContextMenuStore();

export type ContextualResource =
  | 'account'
  | 'transaction'
  | 'category'
  | 'project';

const props = defineProps<{
  resource: ContextualResource;
  id: string;
}>();

// const router = useRouter(); // Hoist router
const dialog = useDialog(); // Hoist dialog controller

const options = computed(() => {
  const opts = [];
  switch (props.resource) {
    case 'project':
      opts.push(
        {
          label: 'Edit project',
          to: `/project/${props.id}`,
        },
        {
          label: 'Delete project',
          onSelect: () => {
            dialog.openDialog(ConfirmDelete, {
              resource: props.resource,
              id: props.id,
            });
          },
        }
      );
      break;
    case 'category':
      opts.push(
        {
          label: 'Edit category',
          to: `/category/${props.id}`,
        },
        {
          label: 'Delete category',
          onSelect: () => {
            dialog.openDialog(ConfirmDelete, {
              resource: props.resource,
              id: props.id,
            });
          },
        }
      );
      break;
    case 'account':
      opts.push(
        {
          label: 'Edit account',
          to: `/account/${props.id}?edit=1`,
        },
        {
          label: 'Delete account',
          onSelect: () => {
            dialog.openDialog(ConfirmDelete, {
              resource: props.resource,
              id: props.id,
            });
          },
        }
      );
      break;
    case 'transaction':
      opts.push(
        {
          label: 'Delete transaction',
          onSelect: () => {
            dialog.openDialog(ConfirmDelete, {
              resource: props.resource,
              id: props.id,
            });
          },
        },
        {
          label: 'Copy transaction',
          to: `/transaction/new?copy=${props.id}`,
        }
      );
      break;
  }
  return [opts];
});
</script>

<template>
  <UContextMenu
    :items="options"
    :ui="{
      content: 'min-w-48 bg-white dark:bg-gray-900 shadow-xl ring-1 ring-gray-200 dark:ring-gray-800 rounded-lg overflow-hidden'
    }"
  >
    <slot />
  </UContextMenu>
</template>

<style scoped></style>
