<script lang="ts" setup>
import { useDialog } from '~/store/dialog';
import { useTransactionStore } from '~/store/transaction';
import { useAccountStore } from '~/store/account';
import { useCategoryStore } from '~/store/category';
import { useProjectStore } from '~/store/project';
import { clearLocalStorage } from '~/components/backup/clearLocalStorage';

const dialog = useDialog();

function cancel() {
  dialog.closeDialog();
}

export type RemovableResource =
  | 'account'
  | 'transaction'
  | 'category'
  | 'project'
  | 'all-application-data';

const props = defineProps<{
  resource: RemovableResource;
  id: string;
}>();

function formatResourceName(resource: RemovableResource): string {
  return resource.replaceAll('-', ' ');
}

const toast = useToast();

function confirm() {
  if (props.resource === 'transaction') {
    const transactionStore = useTransactionStore();
    transactionStore.delete(props.id);
  } else if (props.resource === 'account') {
    const accountStore = useAccountStore();
    accountStore.delete(props.id);
  } else if (props.resource === 'category') {
    const categoryStore = useCategoryStore();
    categoryStore.delete(props.id);
  } else if (props.resource === 'project') {
    const projectStore = useProjectStore();
    projectStore.delete(props.id);
  } else if (props.resource === 'all-application-data') {
    clearLocalStorage();
  }
  dialog.closeDialog();
  toast.add({
    title: `${ucFirst(formatResourceName(props.resource))} was deleted`,
  });
  // TODO: add notification about removed resource
}
</script>

<template>
  <div v-if="resource && id">
    <!-- Icon/Title logic is now handled by UModal's title prop via DialogRoot -->
    <!-- Content -->
    <p>Are you sure to delete the {{ formatResourceName(resource) }}?</p>

    <!-- Footer Actions -->
    <div class="grid grid-cols-2 gap-4 mt-6">
      <UButton class="w-full justify-center" color="neutral" @click.stop="cancel">
        Cancel
      </UButton>
      <UButton class="w-full justify-center" color="neutral" @click.stop="confirm">
        Ok
      </UButton>
    </div>
  </div>
  <div v-else>
    <p v-if="!id" class="text-red-700">Id not passed to confirmation dialog</p>
    <p v-if="!resource" class="text-red-700">
      Resource not passed to confirmation dialog
    </p>
  </div>
</template>

<style scoped></style>
