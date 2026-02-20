<script lang="ts" setup>
import { useDialog } from '~/store/dialog';
import { useCategoryStore } from '~/store/category';
import ConfirmDelete from '~/components/dialog/ConfirmDelete.vue';
import { useTransactionStore } from '~/store/transaction';
import AssertEditDialog from '~/components/dialog/AssertEditDialog.vue';
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
const transactionStore = useTransactionStore(); // Initialize

// Helper to capitalize first letter
function ucFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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
            }, {
              title: 'Delete Project',
              description: 'Are you sure you want to delete this project?'
            });
          },
        }
      );
      break;
    case 'category': {
      const categoryStore = useCategoryStore();
      const category = categoryStore.getById(props.id);

      opts.push(
        {
          label: 'Edit category',
          to: `/category/${props.id}`,
        },
        {
          label: 'Add subcategory',
          to: `/category/new?parent=${category?.id}`,
          disabled: !category,
        },
        {
          label: 'Delete category',
          onSelect: () => {
            dialog.openDialog(ConfirmDelete, {
              resource: props.resource,
              id: props.id,
            }, {
              title: 'Delete Category',
              description: 'Are you sure you want to delete this category?'
            });
          },
        }
      );
      break;
    }
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
            }, {
              title: 'Delete Account',
              description: 'Are you sure you want to delete this account?'
            });
          },
        }
      );
      break;
    case 'transaction':
      opts.push(
        {
          label: 'Add Assert',
          icon: 'i-heroicons-chart-bar',
          onSelect: () => {
            const tx = transactionStore.getById(props.id);
            if (!tx) return;
            dialog.openDialog(AssertEditDialog, {
              initialData: {
                accountId: tx.accountId,
                date: tx.date.split('T')[0],
                value: 0,
              },
            });
          },
        },
        {
          label: 'Delete transaction',
          onSelect: () => {
            const tx = transactionStore.getById(props.id);
            const siblingCount = tx?.splitId
              ? transactionStore.getSiblingsBySplitId(tx.splitId).length
              : 0;
            const description = siblingCount > 1
              ? `This is a split transaction with ${siblingCount} items. All ${siblingCount} will be deleted.`
              : 'Are you sure you want to delete this transaction?';
            dialog.openDialog(
              ConfirmDelete,
              {
                resource: props.resource,
                id: props.id,
              },
              {
                title: siblingCount > 1 ? 'Delete Split Transaction' : 'Delete Transaction',
                description,
              },
            );
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
  <UContextMenu :items="options" :ui="{
    content: 'min-w-48 bg-white dark:bg-gray-900 shadow-xl ring-1 ring-gray-200 dark:ring-gray-800 rounded-lg overflow-hidden'
  }">
    <slot />
  </UContextMenu>
</template>

<style scoped></style>
