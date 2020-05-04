export default {
  namespaced: true,
  actions: {
    ADD(context, payload) {
      return context.commit('EXECUTE', {name: 'ACCOUNT/ADD', payload}, {root: true});
    },
    async REMOVE(context, payload) {
      await context.commit('EXECUTE', {name: 'ACCOUNT/REMOVE', payload}, {root: true})
      await context.commit('EXECUTE', {name: 'TRANSACTION/REMOVE', payload: {account_id: payload.id}}, {root: true})
    },
    UPDATE(context, payload) {
      return context.commit('EXECUTE', {name: 'ACCOUNT/UPDATE', payload}, {root: true})
    }
  }
}
