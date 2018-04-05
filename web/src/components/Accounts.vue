<template>
  <div>
    <h1>Accounts</h1>
    <ul>
      <li v-for="a in accounts">{{a.name}}</li>
    </ul>
  </div>
</template>

<script>
  export default {
    name: 'Accounts',
    computed: {
      accounts() {
        return JSON.parse(localStorage.getItem('accounts')).map(e => { return {name: e} } );
      }
    }
  }
</script>
