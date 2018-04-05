<template>
  <div class="hello">
    <router-view></router-view>

    <div class="buttons">
      <button disabled>Add Transaction</button>
      <button disabled>Budgets</button>
      <button disabled>Schedules</button>
      <button disabled>Search</button>
      <button disabled>Reports</button>
      <a href="/new_account"><button>New Account</button></a>
      <button disabled>Database</button>
      <button disabled>Preferences</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  data () {
    return {
      msg: 'Welcome to Your Vue.js App',
      accounts: [
        {name: "A1"},
        {name: "A2"}
      ]
    }
  }
}
</script>
