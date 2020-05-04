<template>
  <div class="home">
    <div style="display: flex; justify-content: flex-end">
    <ConfigShowClosedAccounts class="mr3"/>
    </div>
    <p>Accounts:</p>

    <div class="container">
    <table>
      <tbody>
      <draggable v-model="accounts" group="people" @start="drag=true" @end="drag=false">

        <tr :key="account.id" v-for="account in accounts" style="height: 2.5em">
<!--          <td style="font-family: monospace">-->
<!--            <router-link :to="{name: 'account', params: {id: account.id}}"-->
<!--                         :title="`${account.transactions} transactions [mean: ${Math.round(100 * account.value / account.transactions)/100}]`">-->
<!--              [{{account.id}}]-->
<!--            </router-link>-->
<!--          </td>-->
          <td>
            <router-link :to="{name: 'account', params: {id: account.id}}"
                         :title="`${account.type} - ${types.find(({ name }) => name === account.type).description}`">
            <AccountIcon :account="account"/>
            </router-link>
          </td>
          <td>
            <router-link :to="{name: 'account', params: {id: account.id}}"
                         :title="`${account.transactions} transactions [mean: ${Math.round(100 * account.value / account.transactions)/100}]`">
            <p>{{account.name}}</p>
            <p class="muted">{{account.description}}</p>
            </router-link>
          </td>
          <td :style="{'text-align': 'right', color: account.value > 0 ? 'green' : 'red'}">
            <span style="font-family: monospace; font-size: 1.0em">{{account.value.toFixed(2)}} {{account.currency}}</span>
          </td>
          <td>
            <i class="icon icon-edit-2 ml2" style="color: #5988E5; cursor: pointer;" @click="openAccountModal(account.id)"></i>
          </td>
          <td>
            <i class="icon icon-trash ml1" style="color: #FF4242; cursor: pointer;" @click="openRemoveDialog(account.id)"></i>
          </td>
        </tr>

      </draggable>
      </tbody>
    </table>
    </div>

    <at-button type="primary" class="m2" @click="openAccountModal(null)">Open Account</at-button>



    <ImportQIF/>
  </div>
</template>

<script>

  import AddForm from '../components/AddForm';
  import ImportQIF from '../components/ImportQIF';
  import draggable from 'vuedraggable';
  import AccountForm from '../components/AccountForm';
  import ConfirmRemoveAccount from '../components/ConfirmRemoveAccount';
  import ConfigShowClosedAccounts from '../components/ConfigShowClosedAccounts';
  import AccountIcon from '../components/AccountIcon';
  import { AccountTypes } from '../helpers/types';

  export default {
    name: 'home',
    components: {
      AccountIcon,
      ConfigShowClosedAccounts,
      ImportQIF,
      AddForm,
      draggable,
    },
    computed: {
      types() {
        return AccountTypes;
      },
      accounts: {
        get() {
          return this.$store.getters.accounts;
        },
        set(value) {
          this.$store.commit('LOAD_ACCOUNTS', value);
        },
      },
    },
    methods: {
      openRemoveDialog(id) {
        this.$store.dispatch('openDialog', { component: ConfirmRemoveAccount, props: {id}, title: 'Confirm Account Deletion' });
      },
      openAccountModal(id) {
        const payload = {
          component: AccountForm,
          title: 'Create Account',
        };
        if(id) {
          const account = this.$store.getters.account(id);
          payload.props = {value: account};
        }
        this.$store.dispatch('openDialog', payload);
      },
      openUpdate(id) {


        // this.$modal.show(AddForm, {
        //   method: "ACCOUNT/UPDATE",
        //   fields:
        // }, {
        //   height: 'auto'
        // }, {
        //   'before-close': (event) => { console.log('this will be called before the modal closes'); }
        // })
      },
    },
  };
</script>
