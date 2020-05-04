<template>
  <!--    <at-modal :value="true" title="Here is title" @on-confirm="handleConfirm" @on-cancel="handleCancel">-->

  <form @submit.prevent.stop="handleConfirm" ref="form" class="form">
    <div class="row mb2">
      <div class="col-24">
        <p class="my1">Account Name</p>
        <at-input v-model="entity.name" placeholder="Account Name"></at-input>
      </div>
    </div>
    <div class="row mb2">

      <div class="col-12">
        <p class="my1">Account Type</p>
        <at-select v-model="entity.type" placeholder="Account Type">
          <at-option :key="type.name" v-for="type in types" :value="type.name" :label="type.name">{{ type.name }} - {{ type.description }}</at-option>
        </at-select>
      </div>

      <div class="col-12">
        <p class="my1">Currency</p>
        <at-select v-model="entity.currency" placeholder="Currency">
          <at-option :key="currency.name" v-for="currency in currencies" :value="currency.name" :label="currency.name">
            <span class="monospace">{{currency.name}}</span> - {{currency.description}}
          </at-option>
        </at-select>
      </div>

    </div>

    <div class="row mb2">
      <div class="col-24">
        <p class="my1">Description</p>
        <at-textarea v-model="entity.description" placeholder="Description..."></at-textarea>
      </div>
    </div>

    <div class="row mb2">
      <div class="col-12">
        <p class="my1">Opening Value</p>
        <at-input-number v-model="entity.opening" placeholder="Opening value" :step="0.01"></at-input-number>
      </div>

      <div class="col-12">
        <p class="my1" style="color: transparent; user-select: none">.</p>
        <at-checkbox v-model="entity.closed">Account Closed / Hidden</at-checkbox>
      </div>
    </div>

  </form>

</template>

<script>
  import { formMixin } from '../helpers/form-mixin';
  import uid from 'uid';
  import { AccountTypes } from '../helpers/types';
  import { Currencies } from '../helpers/currencies';

  export default {
    name: 'AccountForm',
    mixins: [formMixin('ACCOUNT')],
    props: {
      value: {
        type: Object,
        required: false
      }
    },
    mounted() {
      console.log('M', this.value);
      if(this.value) {
        this.entity = { ...this.value };
      }
    },
    data() {
      return {
        entity: {},
      };
    },
    computed: {
      types() {
        return AccountTypes
      },
      currencies() {
        return Currencies
      },
      fields() {
        return [
          {
            value: 'id',
            default: () => uid(),
            hidden: true,
          },
          {
            value: 'name',
            default: () => null,
          },
          {
            value: 'type',
            default: () => null,
          },
          {
            value: 'currency',
            default: () => null,
          },
          {
            value: 'description',
            default: () => null,
          },
          {
            value: 'opening',
            default: () => null,
          },
          {
            value: 'closed',
            default: () => null,
          },
        ];
      },
    },
    methods: {
      handleConfirm() {
        console.log('HANDLE', this.entity);
        this.submit();
      },
    },
  };
</script>

<style>
  .at-input-number__input {
    flex: 0 0 auto;
    padding-left: 4px;
    padding-right: 4px;
  }

  .at-select__dropdown {
    max-height: unset;
  }

  /*.form {*/
  /*    display: grid;*/
  /*    grid-template-columns: 10px 1fr 10px;*/
  /*    grid-gap: 20px;*/
  /*}*/

  /*.form-element {*/
  /*    grid-column: 2 / -2;*/
  /*}*/
</style>
