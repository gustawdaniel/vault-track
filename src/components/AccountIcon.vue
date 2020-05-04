<template>
  <img class="mx1" v-if="icon" :src="icon" height="25px" :alt="account.type" style="vertical-align: text-top;"/>
</template>

<script>
  import { AccountTypes } from '../helpers/types';

  export default {
    name: 'AccountIcon',
    // data() {
    //   return {
    //     icon: null
    //   }
    // },
    // created() {
    //
    // },
    props: {
      account: {
        type: Object,
        required: true,
      },
    },
    computed: {
      types() {
        return AccountTypes;
      },
      icon() {
        const icon = this.types.find(({ name }) => name === this.account.type).icon;
        console.log(icon);
        return require(`@/assets/icons/${icon}`);
      }
    }
  };
</script>

<style scoped>

</style>
