import { defineStore } from 'pinia';
import { type Component, markRaw } from 'vue';

export const useDialog = defineStore('dialog', {
  state: (): {
    isDialogOpen: boolean;
    dialogComponent: Component | null;
    dialogProps: Record<string, unknown>;
    title?: string;
    description?: string;
    fullscreen?: boolean;
  } => ({ isDialogOpen: false, dialogComponent: null, dialogProps: {}, title: undefined, description: undefined, fullscreen: false }),
  actions: {
    openDialog(component: Component, props: Record<string, unknown> = {}, options?: { title?: string, description?: string, fullscreen?: boolean }) {
      console.log('openDialog', component, props);
      this.dialogProps = props;
      this.dialogComponent = markRaw(component);
      this.title = options?.title;
      this.description = options?.description;
      this.fullscreen = options?.fullscreen ?? false;
      this.isDialogOpen = true;
      console.log('openDialog end', this.isDialogOpen, this.dialogComponent, this.dialogProps);
    },
    closeDialog() {
      this.isDialogOpen = false;
      this.dialogComponent = null;
      this.dialogProps = {};
      this.title = undefined;
      this.description = undefined;
      this.fullscreen = false;
    },
  },
});
