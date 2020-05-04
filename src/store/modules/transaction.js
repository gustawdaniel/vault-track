export default {
  namespaced: true,
  actions: {
    ADD(context, payload) {
      if(!Object.hasOwnProperty.call(payload, 'account_id')) {
        payload.account_id = context.rootGetters.account({name: payload.account}).id
      }
      return context.commit('EXECUTE', {name: 'TRANSACTION/ADD', payload}, {root: true});
    },
    REMOVE(context, payload) {
      return context.commit('EXECUTE', {name: 'TRANSACTION/REMOVE', payload}, {root: true})
    },
    UPDATE(context, payload) {
      return context.commit('EXECUTE', {name: 'TRANSACTION/UPDATE', payload}, {root: true})
    },
    SORT(context) {
      return context.commit('SORT_TRANSACTIONS', {}, {root: true})
    }
  }
}
