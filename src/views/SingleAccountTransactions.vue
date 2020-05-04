<template>
  <div>
    <p>{{account.name}} | {{account.value}} {{account.currency}}
      <button @click="sort">SORT</button>
    </p>

    <table>
      <tbody>
      <tr :key="transaction.id" v-for="transaction in $store.getters.transactions(id).reverse()">
        <td>{{formatHuman(transaction.date)}}</td>
        <td><b>{{transaction.payee}}</b><br>
          <span>{{transaction.category}}:{{transaction.subcategory}}</span>
        </td>
        <td :style="{'text-align': 'right', color: transaction.amount > 0 ? 'green' : 'red'}">
          <span>{{transaction.amount}} {{account.currency}}</span>
        </td>
        <td>
          <button @click="remove(transaction.id)">DEL</button>
        </td>
        {{transaction}}
      </tr>
      </tbody>
    </table>

    <AddForm method="TRANSACTION/ADD" :fields="['payee', 'amount', 'category', 'subcategory',
            {value: 'date', default: () => formatYMD(new Date()), type: 'date'},
         {value: 'account_id', default: () => id, hidden: true}]"/>
  </div>
</template>

<script>
  import AddForm from '../components/AddForm';
  import { formatHuman, formatYMD } from '../helpers/date';
  import ConfirmRemoveAccount from '../components/ConfirmRemoveAccount';
  import TransactionForm from '../components/TransactionForm';

  export default {
    name: 'SingleAccountTransactions',
    components: { AddForm },
    props: {
      id: {
        type: String,
      },
    },
    computed: {
      account() {
        return this.$store.getters.account(this.id);
      },
    },
    methods: {
      remove(id) {
        this.$store.dispatch('TRANSACTION/REMOVE', { id });
      },
      formatHuman,
      formatYMD,
      sort() {
        this.$store.dispatch('TRANSACTION/SORT');
      },
    },
    created() {
      this.$store.dispatch('openDialog', { component: TransactionForm, props: {value: {account_id: this.id}}, title: 'Log Transaction' });
    }
  };
</script>

<style scoped>

</style>
