<template>
  <div>
    <at-switch v-model="check" @change="change"></at-switch>
    <span class="ml1">{{'Closed accounts are ' + (check ? 'showed' : 'hidden')}}</span>
  </div>
</template>

<script>
  export default {
    name: 'ConfigShowClosedAccounts',
    computed: {
      check: {
        set(value) {
          console.log(value);
        },
        get() {
          return this.$store.state.config.showClosedAccounts;
        },
      },
    },
    methods: {
      change(value) {
        console.log(value);
        this.$store.commit('SET_CONFIG', {
          patch: [
            {
              op: 'replace',
              path: '/showClosedAccounts',
              value,
            }
          ],
        });
      },
    },
  };
</script>

<style scoped>

</style>
