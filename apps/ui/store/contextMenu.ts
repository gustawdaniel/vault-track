interface State {
  id: string;
}

export const useContextMenuStore = defineStore('context-menu', {
  state: (): State => ({ id: '' }),
  actions: {
    setId(id: string) {
      this.$state.id = id;
    },
    close() {
      this.$state.id = '';
    },
  },
});
