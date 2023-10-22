interface State {
  active: boolean;
}

export const useDebugStore = defineStore('debug', {
  state: (): State => ({
    active: false,
  }),
});
