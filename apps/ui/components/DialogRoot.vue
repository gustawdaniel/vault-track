<script lang="ts" setup>
import { useDialog } from '~/store/dialog';


const dialog = useDialog();

const modalUi = computed(() => {
  if (dialog.fullscreen) {
    return { content: 'sm:max-w-4xl h-[90vh]' };
  }
  return { content: 'sm:max-w-lg' };
});
</script>

<template>
  <UModal v-model:open="dialog.isDialogOpen" :title="dialog.title" :description="dialog.description || 'Dialog'"
    :ui="modalUi">
    <template #body>
      <div :class="{ 'overflow-y-auto max-h-[calc(90vh-4rem)]': dialog.fullscreen }">
        <component :is="dialog.dialogComponent" v-bind="dialog.dialogProps" />
      </div>
    </template>
  </UModal>
</template>

<style>
@media (min-width: 640px) {
  .sm\:max-w-lg {
    max-width: 48rem;
  }

  .sm\:max-w-4xl {
    max-width: 56rem;
  }
}
</style>
