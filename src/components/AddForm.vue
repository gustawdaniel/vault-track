<template>
    <form @submit.prevent.stop="add" ref="form">
        <input v-show="!normalize(field).hidden"
               v-for="field in fields"
               :key="normalize(field).value"
               :type="normalize(field).type"
               v-model="entity[normalize(field).value]"
               :placeholder="normalize(field).name">
        <button type="submit">{{mode}}</button>
    </form>
</template>

<script>
  export default {
    name: 'AddForm',
    props: {
      method: {
        type: String
      },
      fields: {
        type: Array
      }
    },
    data() {
      return {
        entity: {}
      }
    },
    created() {
      this.setDefault()
    },
    computed: {
      mode() {
        return this.fields.find(({value}) => value === 'id') ? 'UPDATE' : 'ADD'
      }
    },
    methods: {
      normalize(field) {
        if(typeof field === 'string')
            return {
              value: field,
              name: field,
              default: () => '',
              type: 'text'
            }
        return {
          type: 'text',
          ...field
        };
      },
      add() {
        let payload;
        if(this.mode === 'ADD') {
          payload = {...this.entity};
        } else {
          payload = {
            where: {id: this.entity.id},
            patch: this.fields
              .filter(({value}) => value !== 'id')
              .map(f => ({
                op: 'replace',
                path: '/'+f.value,
                value: this.entity[f.value]
              }))
          }
        }
        this.$store.dispatch(this.method, payload);
        // this.$refs.form.reset();
        this.setDefault();
      },
      setDefault() {
        this.fields.forEach(f => {
          this.entity[this.normalize(f).value] = this.normalize(f).default();
        })
      }
    }
  };
</script>

<style scoped>

</style>
