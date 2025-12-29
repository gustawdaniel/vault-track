import { defineStore } from 'pinia';
import { type Component, markRaw } from 'vue';

export const useDialog = defineStore('dialog', {
  state: (): {
    isDialogOpen: boolean;
    dialogComponent: Component | null;
    dialogProps: Record<string, unknown>;
  } => ({ isDialogOpen: false, dialogComponent: null, dialogProps: {} }),
  actions: {
    openDialog(component: Component, props: Record<string, unknown> = {}) {
      console.log('openDialog', component, props);
      this.dialogProps = props;
      this.dialogComponent = markRaw(component);
      this.isDialogOpen = true;
      console.log('openDialog end', this.isDialogOpen, this.dialogComponent, this.dialogProps);
    },
    closeDialog() {
      this.isDialogOpen = false;
      this.dialogComponent = null;
      this.dialogProps = {};
    },
  },
});
