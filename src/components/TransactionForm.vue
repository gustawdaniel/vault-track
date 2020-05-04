<template>
  <form @submit.prevent.stop="handleConfirm" ref="form" class="form">
    <div class="row mb2">
      <div class="col-24">
        <p class="my1">Receiver / Product</p>
        <at-input v-model="entity.payee" placeholder="Receiver / Product"></at-input>
      </div>
    </div>
    <!--    <div class="row mb2">-->
    <!--      <pre>{{value}}</pre>-->
    <!--      <pre>{{entity}}</pre>-->
    <!--    </div>-->
    <div class="row mb2">

      <div class="col-12">
        <p class="my1">Account</p>
        <at-select v-model="entity.account_id" placeholder="Account">
          <at-option :key="account.id" v-for="account in $store.getters.accounts" :value="account.id"
                     :label="account.name">{{
            account.name }}
          </at-option>
        </at-select>
      </div>

      <div class="col-12">
        <p class="my1">Date</p>
        <el-date-picker
                size="small"
                style="width: 100%"
                v-model="entity.date"
                type="date"
                placeholder="Pick a day">
        </el-date-picker>
      </div>

    </div>

    <div class="row mb2">

      <div class="col-12">
        <p class="my1">Amount</p>
        <at-input-number
                v-model="entity.amount"
                placeholder="Amount">
        </at-input-number>
      </div>

      <div class="col-12">
        <p class="my1">Type</p>
        <at-select v-model="type" placeholder="Type">
          <at-option :key="type.value" v-for="type in types" :value="type.value" :label="type.name">{{
            type.name }}
          </at-option>
        </at-select>
      </div>

    </div>



    <div class="row mb2">

      <div class="col-12">
        <p class="my1">Category</p>
        <CategoryInput v-model="entity"/>
      </div>

      <div class="col-12">
        <p class="my1">Project</p>
        <at-select v-model="type" placeholder="Project">
          <at-option :key="type.value" v-for="type in types" :value="type.value" :label="type.name">{{
            type.name }}
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
  import { formatYMD } from '../helpers/date';
  import CategoryInput from './CategoryInput';

  const EXPENSE_TYPE = 'EXPENSE';
  const INCOME_TYPE = 'INCOME';
  const TRANSFER_TYPE = 'TRANSFER';

  export default {
    name: 'TransactionForm',
    components: { CategoryInput },
    props: {
      value: {
        type: Object,
      },
    },
    mounted() {
      console.log('M', this.value);
      if (this.value) {
        this.entity = { ...this.value };
      }
    },
    data() {
      return {
        entity: {},
        type: EXPENSE_TYPE,
      };
    },
    computed: {
      fields() {
        return [
          'payee', 'amount', 'category', 'subcategory',
          {
            value: 'date',
            default: () => formatYMD(new Date()),
            type: 'date',
          },
          {
            value: 'account_id',
            required: true,
          }];
      },
      types() {
        return [
          {
            value: EXPENSE_TYPE,
            name: 'Expense',
          },
          {
            value: INCOME_TYPE,
            name: 'Income',
          },
          {
            value: TRANSFER_TYPE,
            name: 'Transfer',
          },
        ];
      },
    },
    methods: {
      handleConfirm() {

      },
    },
  };
</script>

<style scoped>

</style>
