import { type RemovableRef, useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';

interface State {
  active: boolean;
  showFps: RemovableRef<boolean>;
}

export const useDebugStore = defineStore('debug', {
  state: (): State => ({
    active: false,
    showFps: useLocalStorage('debug-show-fps', false),
  }),
  actions: {
    toggleFps() {
      this.showFps = !this.showFps;
    },
  },
});
