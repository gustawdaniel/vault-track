import Vue from 'vue';
import Vuex from 'vuex';
import account from './modules/account';
import transaction from './modules/transaction';
import vuexLocal from '../plugins/persist';
import createLogger from 'vuex/dist/logger';
import uid from 'uid';
import * as jsonpatch from 'fast-json-patch';
import { applyOperation } from 'fast-json-patch';
import { ModalBus, MODAL_OPEN } from '../helpers/modalBus';

Vue.use(Vuex);

const transformCommand = (s, i) => {
  if (i === 0) {
    switch (s) {
      case 'ACCOUNT':
        return 'accounts';
      case 'TRANSACTION':
        return 'transactions';
      default:
        throw new Error(`RESOURCE: ${s} NOT IMPLEMENTED`);
    }
  }
  return s.toLowerCase();
};

const normalizeAccount = (a, getters) => {
  if(!a) return {};
  return {
    id: a.id,
    name: a.name,
    type: a.type || 'Cash',
    currency: a.currency || 'USD',
    description: a.description || '',
    opening: a.opening || 0,
    closed: a.closed || false,
    value: a.value || getters.transactions(a.id)
      .reduce((sum, n) => {
        return (Math.round(100 * sum) + Math.round(100 * n.amount)) / 100;
      }, 0),
    transactions: getters.transactions(a.id).length,
  };
};

const myPlugin = store => {
  store.subscribe(((mutation, state) => {
    if (mutation.type === 'EXECUTE') {
      store.commit('LOG_OPERATION', mutation);
    }
  }));
};

export default new Vuex.Store({
  modules: {
    ACCOUNT: account,
    TRANSACTION: transaction,
  },
  state: {
    accounts: [],
    operations: [],
    transactions: [],
    config: {
      showClosedAccounts: false
    }
  },
  mutations: {
    LOG_OPERATION(state, mutation) {
      state.operations.push(mutation);
    },
    EXECUTE(state, { name, payload }) {
      const [resource, operation] = name.split('/')
        .map(transformCommand);
      console.log(resource, operation);
      if (operation === 'add') {
        state[resource].push({ id: uid(), ...payload });
      } else if (operation === 'remove') {
        const key = Object.keys(payload)[0];
        state[resource].splice(state[resource].findIndex(s => s[key] === payload[key]), 1);
      } else if (operation === 'update') {
        const key = Object.keys(payload.where)[0];
        const index = state[resource].findIndex(s => s[key] === payload.where[key]);
        const document = state[resource][index];
        state[resource].splice(index, 1, jsonpatch.applyPatch(document, payload.patch).newDocument);
      }
    },
    SORT_TRANSACTIONS(state) {
      state.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    LOAD_TRANSACTIONS(state, payload) {
      state.transactions = payload;
    },
    LOAD_ACCOUNTS(state, payload) {
      state.accounts = payload;
    },
    SET_CONFIG(state, payload) {
      state.config = jsonpatch.applyPatch(state.config, payload.patch).newDocument
    }
  },
  actions: {
    LOAD_QIF(context, payload) {
      context.commit('LOAD_ACCOUNTS', payload.accounts.map(a => ({ id: uid(), ...a })));

      console.log('A', context.getters.accounts);

      const name_id_map = context.getters.accounts.reduce((p, n) => {
        return {
          ...p,
          [n.name]: n.id,
        };
      }, {});
      console.log(name_id_map);
      context.commit('LOAD_TRANSACTIONS', payload.transactions.map(a => ({
        id: uid(),
        account_id: name_id_map[a.account], ...a,
      })));
    },
    openDialog(context, { component, props = {}, title }) {
      console.log(props);
      ModalBus.$emit(MODAL_OPEN, {
        component,
        props,
        title,
      });
    },
  },
  getters: {
    accounts(state, getters) {
      return state.accounts.map(a => normalizeAccount(a, getters)).filter(({closed}) => state.config.showClosedAccounts || !closed);
    },
    account(state, getters) {
      return query => {
        let a;
        if (typeof query === 'string') {
          a = state.accounts.find((account) => account.id === query);
        } else {
          const key = Object.keys(query)[0];
          a = state.accounts.find((account) => account[key] === query[key]);
        }
        return normalizeAccount(a, getters);
      };
    },
    transactions(state) {
      return id => state.transactions.filter(t => t.account_id === id);
    },
  },
  plugins: [vuexLocal.plugin, myPlugin], // createLogger(),
});
