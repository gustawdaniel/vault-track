<template>
  <label>
    <span>{{ $t('transaction.category') }}</span>

    <input
           type="text" ref="category" @input="$emit('input', $refs.category.value)"
           class="border p-2 w-full focus:outline-none focus:border-blue-300 focus:outline-none focus:border-blue-300">


    <!--    <input readonly-->
<!--           type="text" ref="category" @input="$emit('input', $refs.category.value)"-->
<!--           @focus="openDialog"-->
<!--           class="border p-2 w-full focus:outline-none focus:border-blue-300 focus:outline-none focus:border-blue-300">-->
  </label>
</template>

<script>
export default {
  name: "CategorySelector",
  props: {
    value: {
      type: String
    }
  },
  mounted() {
    this.$refs.category.value = this.value || '';
  },
  methods: {
    openDialog() {
      this.$root.$emit('modal', {
        data: {
          type: 'list',
          title: this.$t('transaction.category'),
          elements: [
            {
              name: this.$t('category.no'), handler: () => {
                console.log("CLICK", 'NO');
                this.$refs.category.value = '';
              }
            },
            ...this.$store.getters.categories.map(c => ({
              name: c, handler: () => {
                console.log("CLICK", c);
              }
            })),
            {
              name: this.$t('category.add'), handler: () => {
                console.log("CLICK", 'ADD');

                this.$root.$emit('modal', {
                  data: {
                    type: 'new-category',
                    handler: (name) => {
                      this.$store.dispatch('category/add', {data: {name}});
                      this.$refs.category.value = name;
                    }
                  }
                });

              }
            },
          ]
        }
      })
    }
  }
}
</script>

<style scoped>

</style>
