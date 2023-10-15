<script lang="ts" setup>
import { useAccountStore } from '~/store/account';
import { useCategoryStore } from '~/store/category';
import { useTransactionStore } from '~/store/transaction';

const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const transactionStore = useTransactionStore();

function computeBalance() {
  accountStore.computeAllBalances();
}
</script>

<template>
  <div>
    <p>
      Cat: {{ categoryStore.categories.length }} | Acc:
      {{ accountStore.accounts.length }} | Trx:
      {{ transactionStore.transactions.length }}
    </p>
    <button class="border" @click="computeBalance">Compute balance</button>
  </div>
</template>

<style scoped></style>
