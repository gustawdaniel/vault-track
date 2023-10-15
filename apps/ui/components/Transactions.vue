<script lang="ts" setup>
import { useTransactionStore } from '~/store/transaction';

const transactionStore = useTransactionStore();
</script>

<template>
  <div class="text-xs">
    <ul>
      <li
        v-for="(transaction, index) of transactionStore.transactions"
        :key="index"
      >
        {{ transaction }}
      </li>
    </ul>
  </div>
</template>

<style scoped></style>
