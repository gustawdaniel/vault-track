<template>
  <at-modal :value="true" @on-cancel="handleClose">
    <div slot="header" style="text-align:center;">
      <span>Confirm Deletion of Account: {{$store.getters.account(id).name}}</span>
    </div>
    <div>
      <p class="center">Please type <span class="bold">{{$store.getters.account(id).name}}</span> and click confirm.</p>
      <at-input class="my1" v-model="name" placeholder="Type name of account to confirm"></at-input>
      <p>All transactions connected with this account will be removed.</p>
    </div>
    <div slot="footer">
      <at-button style="width:100%;" type="error" @click="handleConfirm" :disabled="name !== $store.getters.account(id).name">Confirm</at-button>
    </div>
  </at-modal>
</template>

<script>
  import { MODAL_CLOSE, ModalBus } from '../helpers/modalBus';

  export default {
    name: 'ConfirmRemoveAccount',
    props: {
      id: {
        type: String
      }
    },
    data() {
      return {
        name: ""
      }
    },
    methods: {
      handleClose() {
        console.log('close');
        ModalBus.$emit(MODAL_CLOSE);
      },
      handleConfirm() {
        const id = this.id;
        this.$store.dispatch('ACCOUNT/REMOVE', { id });
        this.handleClose();
      }
    }
  };
</script>

<style scoped>

</style>
