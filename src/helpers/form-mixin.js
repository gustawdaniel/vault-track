import store from '../store';

export const formMixin = (resource) => ({
  computed: {
    mode() {
      return this.value ? 'UPDATE' : 'ADD'
    },
    method() {
      return resource + '/' + this.mode;
    }
  },
  methods: {
    normalize(field) {
      if (typeof field === 'string') {
        return {
          value: field,
          name: field,
          default: () => '',
          type: 'text',
        };
      }
      return {
        type: 'text',
        ...field,
      };
    },
    async submit() {
      let payload;
      if (this.mode === 'ADD') {
        payload = { ...this.entity };
      } else {
        payload = {
          where: { id: this.entity.id },
          patch: this.fields
            .filter(({ value }) => value !== 'id')
            .map(f => ({
              op: 'replace',
              path: '/' + f.value,
              value: this.entity[f.value],
            })),
        };
      }
      await store.dispatch(this.method, payload);
      // this.$refs.form.reset();
      this.setDefault();
    },
    setDefault() {
      this.fields.forEach(f => {
        this.entity[this.normalize(f).value] = this.normalize(f)
          .default();
      });
    },
  },
});
