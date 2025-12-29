<script lang="ts" setup>
import { useDialog } from '~/store/dialog';

const dialog = useDialog();
</script>

<template>
<UModal v-model:open="dialog.isDialogOpen">
    <!-- <UButton label="Open" color="neutral" variant="subtle" /> -->

    <template #content>
      <component
        :is="dialog.dialogComponent"
        v-bind="dialog.dialogProps"
        @close="dialog.closeDialog"
      />
    </template>
  </UModal>


  <!-- <UModal v-model="dialog.isDialogOpen">

  </UModal> -->
</template>

<style>
@media (min-width: 640px) {
  .sm\:max-w-lg {
    max-width: 48rem;
  }
}
</style>
