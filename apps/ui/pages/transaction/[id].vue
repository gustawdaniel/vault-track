<script lang="ts" setup>
import { useRoute, useRouter } from '#imports';
import SingleTransactionEdit from '~/components/transactions/SingleTransactionEdit.vue';
import { type FullTransaction, useTransactionStore } from '~/store/transaction';
import { useAccountStore } from '~/store/account';

const route = useRoute();
const router = useRouter();

console.log(route.query.account);

const NEW_TRANSACTION_ID = 'new';

const transactionId: string = String(route.params.id);

const transactionStore = useTransactionStore();
const accountStore = useAccountStore();

function newTransaction(): FullTransaction {
  const transaction = transactionStore.getNew();

  if (route.query.account) {
    const account = accountStore.getById(String(route.query.account));
    if (account) {
      transaction.account = account.name;
      transaction.accountId = account.id;
    }
  }

  if (route.query.copy) {
    const original = transactionStore.getById(String(route.query.copy));
    if (original) {
      transaction.account = original.account;
      transaction.accountId = original.accountId;
      transaction.date = original.date;
      transaction.amount = original.amount;
      transaction.category = original.category;
      transaction.clearedStatus = original.clearedStatus;
      transaction.memo = original.memo;
      transaction.payee = original.payee;
      transaction.transferHash = original.transferHash;
    }
  }

  return transaction;
}

const transaction =
  transactionId === NEW_TRANSACTION_ID
    ? newTransaction()
    : transactionStore.getById(transactionId);
const reverseTransaction = transactionStore.getReverseByIdAndHash(
  transactionId,
  transaction?.transferHash,
);

function goToAccountPage(event?: { transactionId: string }) {
  if (transaction) {
    const returnTransactionId = event ? event.transactionId : transaction.id;
    router.push(`/account/${transaction.accountId}#${returnTransactionId}`);
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
