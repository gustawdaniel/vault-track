<template>
  <at-modal v-model="open"
            max-width="1000px"
            :title="title"
            :okText="title"
            @on-confirm="handleConfirm"
            @on-cancel="handleClose">
    <!--        <template v-if="open">-->
    <component :is="component" v-bind.sync="props" ref="component"/>
    <!--        </template>-->
  </at-modal>
</template>

<script>
  import { MODAL_CLOSE, MODAL_OPEN, ModalBus } from '../helpers/modalBus';

  export default {
    name: 'ModalRoot',
    data() {
      return {
        component: null,
        props: null,
        open: false,
        title: '',
      };
    },
    created() {
      ModalBus.$on(MODAL_OPEN, ({ component, props = null, title = 'Default Modal' }) => {
        this.component = component;
        this.props = props;
        this.open = true;
        this.title = title;
      });
      ModalBus.$on(MODAL_CLOSE, () => {
        this.open = false;
        setTimeout(() => {
          this.component = null;
          this.props = null;
          this.title = '';
        }, 250);
      });
    },
    methods: {
      handleConfirm() {
        this.$refs.component.handleConfirm();
      },
      handleClose() {
        ModalBus.$emit(MODAL_CLOSE);
      },
    },
  };
</script>

<style scoped>

</style>
