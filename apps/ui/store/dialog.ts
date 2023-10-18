import { defineStore } from 'pinia';
import type { Component } from 'vue';

export const useDialog = defineStore('dialog', {
  state: (): {
    isDialogOpen: boolean;
    dialogComponent: Component | null;
    dialogProps: Record<string, unknown>;
  } => ({ isDialogOpen: false, dialogComponent: null, dialogProps: {} }),
  actions: {
    openDialog(component: Component, props: Record<string, unknown> = {}) {
      this.dialogProps = props;
      this.dialogComponent = component;
      this.isDialogOpen = true;
    },
    closeDialog() {
      this.isDialogOpen = false;
      this.dialogComponent = null;
      this.dialogProps = {};
    },
  },
});
