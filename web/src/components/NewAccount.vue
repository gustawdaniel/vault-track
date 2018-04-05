<template>
  <div>
    <h1>New Account</h1>
    <form @submit.prevent="save">
      <input name="name" type="text" placeholder="Name">
      <label for="bank">Account type</label>
      <select id="bank" name="bank">
        <option value="bank">Bank</option>
        <option value="cash">Cash</option>
        <option value="card">Credit Card</option>
      </select>
      <label for="currency">Currency</label>
      <select name="currency" id="currency">
        <option value="usd">USD</option>
        <option value="pln" selected>PLN</option>
      </select>
      <input name="description" type="text" placeholder="Description">
      <input name="opening_amount" type="number" placeholder="Opening Amount" value="0">
      <input name="position_order" type="number" placeholder="Position Order" value="0">
      <label for="closed">Closed</label>
      <input type="checkbox" id="closed" name="closed">
      <input type="submit">
    </form>
  </div>
</template>

<script>
  export default {
    name: 'NewAccount',
    methods: {
        save(e) {
//            console.log(e.target.name.value);
            let old = JSON.parse(localStorage.getItem('accounts'));

            if(!old) {
                old = [];
            }

            old.push(e.target.name.value);

            localStorage.setItem('accounts', JSON.stringify(old))
        }
    }
  }
</script>
