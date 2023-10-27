<script lang="ts" setup>
import { useDialog } from '~/store/dialog';
import ConfirmDelete from '~/components/dialog/ConfirmDelete.vue';

function openClearConfirmationDialog() {
  const dialog = useDialog();
  dialog.openDialog(ConfirmDelete, {
    resource: 'all-application-data',
    id: 'all',
  });
}
</script>

<template>
  <UContainer>
    <div class="mt-5 border-b border-gray-200 bg-white px-4 py-5">
      <div
        class="-ml-4 -mt-4 flex flex-wrap items-center justify-between sm:flex-nowrap"
      >
        <div class="mt-4">
          <h3 class="text-base font-semibold leading-6 text-gray-900">
            Remove all data
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            This option will clear all data stored by this app.
          </p>
        </div>
        <div class="ml-4 mt-4 flex-shrink-0">
          <button
            class="bg-red-700 hover:bg-red-600 focus-visible:outline-red-700 relative inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            type="button"
            @click="openClearConfirmationDialog"
          >
            Delete all data
          </button>
        </div>
      </div>
    </div>
  </UContainer>
</template>
