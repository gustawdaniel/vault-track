<template>
  <div class="container">

    <div class="flex flex-wrap">
      <div class="w-full px-2 my-2">
        <label>
          <p>{{ $t('transaction.payee') }}</p>
          <input type="text" v-model="transaction.payee"
                 class="border p-2 w-full focus:outline-none focus:border-blue-300 focus:outline-none focus:border-blue-300">
        </label>
      </div>
      <div class="w-1/2 px-2  my-2">
        <div>
          <p v-if="transaction.type === 't'">{{ $t('transaction.from-account') }}</p>
          <p v-else>{{ $t('transaction.account') }}</p>

          <multiselect
            v-model="transaction.account"
            :allow-empty="false"
            :searchable="false"
            :clear-on-select="false"
            :options="accounts.map(a => a.name)">
          </multiselect>

        </div>
      </div>
      <div class="w-1/2 px-2  my-2">
        <label>
          <p>{{ $t('transaction.date') }}</p>

          <input type="date" v-model="transaction.date"
                 class="border p-2 w-full focus:outline-none focus:border-blue-300 focus:outline-none focus:border-blue-300">
        </label>
      </div>

      <div class="w-1/2 px-2  my-2">
        <label>
          <span>
            <span v-if="needCurrencyConversion">{{ $t('transaction.from-amount') }}</span>
            <span v-else>{{ $t('transaction.amount') }}</span>
            <span v-if="account">({{ account.currency }})</span>
          </span>

          <input type="number"
                 v-model="transaction.amount"
                 class="border p-2 w-full focus:outline-none focus:border-blue-300 focus:outline-none focus:border-blue-300">
        </label>
      </div>


      <div class="w-1/2 px-2  my-2">
        <div>
          <p>{{ $t('transaction.type') }}</p>

          <multiselect
            v-model="transaction.type"
            :allow-empty="false"
            :searchable="false"
            :clear-on-select="false"
            :custom-label="opt => types[opt]"
            :options="Object.keys(types)">
          </multiselect>

        </div>
      </div>


      <div class="w-1/2 px-2  my-2">
        <div v-if="transaction.type === 't'">
          <p>{{ $t('transaction.to-account') }}</p>

          <multiselect
            v-model="transaction.targetAccount"
            :allow-empty="false"
            :searchable="false"
            :clear-on-select="false"
            :options="accounts.map(a => a.name)">
          </multiselect>
        </div>
        <div v-else>

          <CategorySelector v-model="transaction.category"/>

        </div>
      </div>

      <div class="w-1/2 px-2  my-2">
        <div>
          <p>{{ $t('transaction.project') }}</p>

          <multiselect
            disabled
            v-model="transaction.project"
            :allow-empty="false"
            :searchable="false"
            :clear-on-select="false"
            :options="projects">
          </multiselect>

        </div>
      </div>

      <div v-if="needCurrencyConversion" class="w-1/2 px-2 my-2">
        <label>
          <span>
            <span>{{ $t('transaction.to-amount') }}</span>
            <span v-if="targetAccount">({{ targetAccount.currency }})</span>
          </span>

          <input type="number" v-model="transaction.targetAmount"
                 @keyup="updateConversionRate"
                 @change="updateConversionRate"
                 class="border p-2 w-full focus:outline-none focus:border-blue-300 focus:outline-none focus:border-blue-300">
        </label>
      </div>
      <div v-if="needCurrencyConversion" class="w-1/2 px-2 my-2">
        <div>
          <p>{{ $t('transaction.conversion-rate') }}</p>

          <div class="font-bold text-center">
            <p>1 {{ account.currency }} = {{ sourceByTargetConversionRate.toFixed(4) }} {{ targetAccount.currency }}</p>
            <p>1 {{ targetAccount.currency }} = {{ (1 / sourceByTargetConversionRate).toFixed(4) }}
              {{ account.currency }}</p>
          </div>
        </div>
      </div>

      <div class="w-1/2 px-2 my-2">
        <div>
          <p v-if="transaction.type === 't'">{{ $t('transaction.from-status') }}</p>
          <p v-else>{{ $t('transaction.status') }}</p>

          <multiselect
            v-model="transaction.status"
            :custom-label="opt => statuses[opt]"
            :searchable="false"
            :options="Object.keys(statuses)">
          </multiselect>

        </div>
      </div>

      <div class="w-1/2 px-2 my-2">
        <div v-if="transaction.type === 't'">
          <p>{{ $t('transaction.to-status') }}</p>

          <multiselect
            v-model="transaction.targetStatus"
            :custom-label="opt => statuses[opt]"
            :searchable="false"
            :options="Object.keys(statuses)">
          </multiselect>
        </div>
        <div v-else>
          <p>{{ $t('transaction.split') }}</p>

          <p class="text-right">
            <button class="border-l w-10 text-gray-400 cursor-not-allowed" disabled>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </button>
          </p>
        </div>
      </div>


      <div class="w-full px-2  my-2">
        <label>
          <span>{{ $t('transaction.description') }}</span>
          <textarea v-model="transaction.description"
                    class="border p-2 w-full focus:outline-none focus:border-blue-300"/>
        </label>
      </div>

      <div class="w-full px-2  my-2">
        <label>
          <span>{{ $t('transaction.order') }}</span>
          <input v-model="transaction.order" type="number"
                    class="border p-2 w-full focus:outline-none focus:border-blue-300"/>
        </label>
      </div>

    </div>


    <div class="flex justify-around">
      <nuxt-link class="border-r border-t w-1/2 p-3 text-center" to="/">{{ $t('common.back') }}</nuxt-link>
      <button class="border-t w-1/2 p-3" @click="save">{{ $t('common.save') }}</button>
    </div>
  </div>
</template>

<script>
import Multiselect from "vue-multiselect";
import CategorySelector from '~/components/CategorySelector'
import {
  TRANSACTION_COST,
  TRANSACTION_TRANSFER,
  TRANSACTION_INCOME
} from "~/constants/transaction-types";

import {
  TRANSACTION_AGREED,
  TRANSACTION_DISAGREED,
  TRANSACTION_NOT_AGREED,
  TRANSACTION_SETTLED
} from "~/constants/transaction-statuses";

export default {
  name: "AddTransaction",
  props: {
    accountName: {
      type: String,
      required: false
    },
    copyMode: {
      type: Boolean,
      required: false,
      default: () => false
    },
    baseTransaction: {
      type: Object,
      required: false
    }
  },
  components: {Multiselect, CategorySelector},
  data() {
    let transaction;

    if (this.baseTransaction) {

      if (/\[.*\]/.test(this.baseTransaction.category)) {

        const targetAccount = this.baseTransaction.category.match(/\[(.*)]/)[1];

        const connectedTransaction = this.$store.state.transactions.find(t =>
          t.payee === this.baseTransaction.payee &&
          t.date === this.baseTransaction.date &&
          t.account === targetAccount
        )

        transaction = {
          ...this.baseTransaction,
          amount: Math.abs(this.baseTransaction.amount),
          type: TRANSACTION_TRANSFER,
          targetAccount,
          targetAmount: connectedTransaction.amount
        };

        delete transaction.category;

      } else {

        transaction = {
          ...this.baseTransaction,
          amount: Math.abs(this.baseTransaction.amount),
          type: this.baseTransaction.amount < 0 ? TRANSACTION_COST : TRANSACTION_INCOME
        };

      }


    } else {
      transaction = {
        payee: '',
        account: this.accountName || '',
        amount: '',
        date: new Date().toISOString().substr(0, 10),
        // type: {code: TRANSACTION_TRANSFER, name: this.$t(`transaction.types.${TRANSACTION_TRANSFER}`)},
        // targetAccount: 'PLN bank'
        type: TRANSACTION_COST
      };
    }

    return {
      sourceByTargetConversionRate: 1,
      transaction
    }
  },
  mounted() {
    if (this.baseTransaction && /\[.*\]/.test(this.baseTransaction.category)) {
      this.updateConversionRate();
    }
  },
  computed: {
    account() {
      return this.$store.getters.accounts.find(a => a.name === this.transaction.account)
    },
    targetAccount() {
      return this.$store.getters.accounts.find(a => a.name === this.transaction.targetAccount)
    },
    accounts() {
      return this.$store.getters.accounts;
    },
    needCurrencyConversion() {
      return this.transaction.type === TRANSACTION_TRANSFER && this.account && this.targetAccount &&
        this.account.currency !== this.targetAccount.currency;
    },
    types() {
      return [TRANSACTION_INCOME, TRANSACTION_COST, TRANSACTION_TRANSFER].reduce((p,n) => ({
        ...p,
        [n]: this.$t(`transaction.types.${n}`)
      }), {})
    },
    statuses() {
      return [TRANSACTION_NOT_AGREED, TRANSACTION_SETTLED, TRANSACTION_AGREED, TRANSACTION_DISAGREED]
        .reduce((p,n) => ({
        ...p,
        [n]: this.$t(`transaction.statuses.${n}`)
      }), {})
    },
    projects() {
      return [];
    },
    categories() {
      return [];
    }
  },
  methods: {
    async save() {
      if(this.transaction.type === TRANSACTION_TRANSFER && this.account.currency === this.targetAccount.currency) {
        this.transaction.targetAmount = this.transaction.amount;
      }
      console.log(this.baseTransaction && !this.copyMode);
      if (this.baseTransaction && !this.copyMode) {
        await this.$store.dispatch('transaction/save', {
          where: {...this.baseTransaction},
          data: {...this.transaction}
        });
      } else {
        await this.$store.dispatch('transaction/save', {
          data: {
            ...this.transaction,
          }
        });
      }
      return this.$router.push({path: '/transactions', query: {account: this.accountName || this.transaction.account}})
    },
    updateConversionRate() {
      if (this.transaction.amount && this.transaction.targetAmount) {
        this.sourceByTargetConversionRate = this.transaction.amount / this.transaction.targetAmount;
      }
    }
  },
  watch: {
    'transaction.amount'(n, o) {
      if (this.needCurrencyConversion) {
        this.$set(this.transaction, 'targetAmount', n / this.sourceByTargetConversionRate);
      }
    },
  }
}
</script>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>
