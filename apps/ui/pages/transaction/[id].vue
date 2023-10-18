<script lang="ts" setup>
import { useRoute, useRouter } from '#imports';
import SingleTransactionEdit from '~/components/transactions/SingleTransactionEdit.vue';
import { useTransactionStore } from '~/store/transaction';

const route = useRoute();
const router = useRouter();

const NEW_TRANSACTION_ID = 'new';

const transactionId: string = String(route.params.id);

const transactionStore = useTransactionStore();
const transaction =
  transactionId === NEW_TRANSACTION_ID
    ? transactionStore.getNew()
    : transactionStore.getById(transactionId);
const reverseTransaction = transactionStore.getReverseByIdAndHash(
  transactionId,
  transaction?.transferHash,
);

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
    <SingleTransactionEdit
      :reverse-transaction="reverseTransaction"
      :transaction="transaction"
      @exit="goToAccountPage"
    />
  </div>
  <div v-else>
    <p>Transaction {{ transactionId }} not found</p>
  </div>
</template>

<style scoped></style>
