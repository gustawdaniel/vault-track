<script lang="ts" setup>
import { useRoute } from '#imports';
import SingleTransactionEdit from '~/components/transactions/SingleTransactionEdit.vue';
import { useTransactionStore } from '~/store/transaction';

const route = useRoute();

const transactionId: string = String(route.params.id);

const transactionStore = useTransactionStore();
const transaction = transactionStore.getById(transactionId);
</script>

<template>
  <div v-if="transaction">
    <SingleTransactionEdit :transaction="transaction" />
  </div>
  <div v-else>
    <p>Transaction {{ transactionId }} not found</p>
  </div>
</template>

<style scoped></style>
