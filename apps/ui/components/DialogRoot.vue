<script lang="ts" setup>
import { useDialog } from '~/store/dialog';

const dialog = useDialog();
</script>

<template>
  <UModal
    v-model="dialog.isDialogOpen"
    :ui="{
      container: 'flex min-h-full items-center justify-center text-center',
    }"
  >
    <component
      :is="dialog.dialogComponent"
      v-bind="dialog.dialogProps"
      @close="dialog.closeDialog"
    />
  </UModal>
</template>

<!--<style>-->
<!--@media (min-width: 640px) {-->
<!--  .sm\:max-w-lg {-->
<!--    max-width: 48rem;-->
<!--  }-->
<!--}-->
<!--</style>-->
