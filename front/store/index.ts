import {
  TRANSACTION_COST,
  TRANSACTION_TRANSFER,
  TRANSACTION_INCOME
} from "~/constants/transaction-types";
import {deserializeQif, QifAccount, QifData, QifTransaction, QifType, serializeQif} from "qif-ts";
import {download} from "@/helpers/download";
import {GetterTree, ActionTree, MutationTree} from 'vuex'

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
type AppTransaction = Overwrite<QifTransaction, {
  account: string,
  amount: number
}>

const transactionFilterAssociatedByTransfer = (where?: { date: string, payee: string, category: string, account: string }) => {
  if (!where) return undefined;

  const accountsRegexpResults = where.category.match(/\[(.*)]/);

  return {
    date: where.date,
    payee: where.payee,
    account: accountsRegexpResults?.length ? accountsRegexpResults[1] : '',
    category: `[${where.account}]`
  }
};

const filterByWhere = (where: object) => (t: object) => {
  return JSON.stringify(Object.keys(where).reduce((o: object, k: string) => ({
    ...o,
    //@ts-ignore
    [k]: t[k]
  }), {})) === JSON.stringify(where)
}

interface AppCategory {
  name: string
}

export const state = () => ({
  accounts: [] as QifAccount[],
  transactions: [] as AppTransaction[],
  categories: [] as AppCategory[],
  config: {
    showHidden: false
  }
})

export type RootState = ReturnType<typeof state>

export const mutations: MutationTree<RootState> = {
  init(state, payload) {
    state.accounts = payload.accounts;
    state.transactions = payload.transactions;
    state.categories = payload.categories || [];
  },
  setAccount(state, {where, data}) {
    const item = state.accounts.find(item => item.name === where.name);

    if (where.name !== data.name) {
      state.transactions.filter(t => t.account === where.name).forEach(t => {
        Object.assign(t, {...t, account: data.name})
      })
    }

    Object.assign(item, data);
  },
  addAccount(state, {data}) {
    state.accounts.push(data);
  },
  toggleShowHidden(state) {
    state.config.showHidden = !state.config.showHidden;
  },
  reloadTotalAfter(state, {filter = (t: QifTransaction) => t.account === 'mBank'}) {
    state.transactions.sort(
      (a, b) => ((a.date || '') + a.order || '')
        .localeCompare((b.date || '') + b.order || '')
    );

    interface Accumulator {
      [key: string]: number
    }

    state.transactions.filter(filter).reduce((accountsAccumulator: Accumulator, n, i) => {
      if (!accountsAccumulator.hasOwnProperty(n.account)) accountsAccumulator[n.account] = 0;
      accountsAccumulator[n.account] += n.amount * 100;

      console.log(i, n, accountsAccumulator);
      Object.assign(n, {...n, totalAfter: accountsAccumulator[n.account] / 100});
      return accountsAccumulator;
    }, {});
  },
  'setTransaction'(state, {where, data}) {
    if (where) {
      const item = state.transactions.find(filterByWhere(where));

      if (!item) {
        console.warn('No item fount by', where)
      } else {
        Object.assign(item, data);
      }
    } else {
      state.transactions.push(data);
    }
  },
  fixAmount(state) {
    state.transactions.filter(t => t.account === 'mBank').forEach(t => {
      Object.assign(t, {...t, amount: parseFloat(String(t.amount))});
    })

  },
  removeTransactions(state, {where}) {
    state.transactions = state.transactions.filter(t => t.account !== where.account);
  },
  removeAccount(state, {where}) {
    const index = state.accounts.findIndex(a => a.name === where.name);
    state.accounts.splice(index, 1)
  },
  removeTransaction(state, {where}) {
    const index = state.transactions.findIndex(filterByWhere(where));
    state.transactions.splice(index, 1)
  },
  addCategory(state, {data}: { data: AppCategory }) {
    state.categories.push(data);
  }
}

export const actions: ActionTree<RootState, RootState> = {
  'database/export'({getters}) {
    const out = getters.databaseText;
    console.log(out);
    download("out.qif", out);
  },
  async 'database/import'({commit}, text) {
    const qifData: QifData = deserializeQif(text);
    console.log(qifData);

    commit('init', qifData);
  },
  'database/truncate'({commit}) {
    commit('init', {
      transactions: [],
      accounts: []
    })
  },
  'account/save'({state, commit}, {where, data}) {
    if (where) {
      if (where.name !== data.name) {
        if (state.accounts.find(item => item.name === data.name)) {
          throw new Error(`Name ${data.name} is taken. Names of accounts need to be unique.`)
        }
      }

      commit('setAccount', {where, data});
    } else {
      commit('addAccount', {data});
    }
  },
  'account/remove'({state, commit}, {where}) {
    commit('removeTransactions', {where: {account: where.name}});
    commit('removeAccount', {where})
  },
  'category/add'({commit}, {data}) {
    commit('addCategory', {data});
  },
  'transaction/remove'({commit}, {where}) {
    if (where.type === TRANSACTION_TRANSFER) {
      commit('removeTransaction', {
        where: transactionFilterAssociatedByTransfer(where)
      });

    }
    commit('removeTransaction', {where});

  },
  'transaction/save'({state, commit}, {where, data}) {

    console.log(where, data);

    if (data.type === TRANSACTION_TRANSFER) {
      if (!data.targetAmount) {
        data.targetAmount = 0;
      }

      commit('setTransaction', {
        where,
        data: {
          payee: data.payee,
          account: data.account,
          amount: -parseFloat(data.amount),
          date: data.date,
          type: TRANSACTION_TRANSFER,
          category: `[${data.targetAccount}]`,
          order: parseInt(String(data.order)) || state.transactions.filter(filterByWhere({
            date: data.date,
            account: data.account
          })).length + 1
        }
      })
      commit('setTransaction', {
        where: transactionFilterAssociatedByTransfer(where),
        data: {
          payee: data.payee,
          account: data.targetAccount,
          amount: parseFloat(data.targetAmount),
          date: data.date,
          type: TRANSACTION_TRANSFER,
          category: `[${data.account}]`,
          order: parseInt(String(data.order)) || state.transactions.filter(filterByWhere({
            date: data.date,
            account: data.targetAmount
          })).length + 1
        }
      })


      commit('reloadTotalAfter', {
        filter: (t: AppTransaction) => t.account === data.account || t.account === data.targetAccount
      })
    } else {

      if (data.type === TRANSACTION_COST) {
        data.amount = -parseFloat(data.amount);
      } else if (data.type === TRANSACTION_INCOME) {
        data.amount = parseFloat(data.amount);
      }

      data.order = parseInt(String(data.order)) || state.transactions.filter(filterByWhere({
        date: data.date,
        account: data.account
      })).length + 1

      commit('setTransaction', {where, data})

      commit('reloadTotalAfter', {filter: (t: AppTransaction) => t.account === data.account})
    }
  }
}

export const getters: GetterTree<RootState, RootState> = {
  accounts(state) {
    const accounts = state.accounts.filter(a => state.config.showHidden || !a.hidden);

    accounts.sort((a, b) => (a.order || 0) - (b.order || 0));

    return accounts;
  },
  categories(state) {
    return state.categories.filter(c => c.name === c.name.replace(/:.*/, ''))
  },
  databaseText(state) {
    return serializeQif({
      type: QifType.Account,
      ...state
    });
  }
}
