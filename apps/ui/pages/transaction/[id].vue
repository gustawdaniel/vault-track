<script lang="ts" setup>
import { useRoute, useRouter } from '#imports';
import SingleTransactionEdit from '~/components/transactions/SingleTransactionEdit.vue';
import { useTransactionStore } from '~/store/transaction';

const route = useRoute();
const router = useRouter();

const transactionId: string = String(route.params.id);

const transactionStore = useTransactionStore();
const transaction = transactionStore.getById(transactionId);

function goToAccountPage() {
  if (transaction) {
    router.push(`/account/${transaction.accountId}`);
  } else {
    router.push(`/`);
  }
}
</script>

<template>
  <div v-if="transaction">
    <SingleTransactionEdit :transaction="transaction" @exit="goToAccountPage" />
  </div>
  <div v-else>
    <p>Transaction {{ transactionId }} not found</p>
  </div>
</template>

<style scoped></style>
