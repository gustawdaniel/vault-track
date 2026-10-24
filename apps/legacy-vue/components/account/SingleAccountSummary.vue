<script lang="ts" setup>
import type { ComputedAccount } from '~/store/account';
import { formatAmount } from '~/utils/formatAmount';
import AppContainer from '~/components/shared/AppContainer.vue';
import UploadTransactionsToAccount from '~/components/account/UploadTransactionsToAccount.vue';
import { useTransactionStore } from '~/store/transaction';
import { exportTransactionsCsv, downloadCsv } from '~/utils/exportTransactionsCsv';

const transactionStore = useTransactionStore();

const props = defineProps<{
  account: ComputedAccount;
}>();

const emit = defineEmits(['edit']);

function handleExportCsv() {
  const transactions = transactionStore.getAllByAccountId(props.account.id);
  const csv = exportTransactionsCsv(transactions);
  const date = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `${props.account.name}_${date}.csv`);
}
</script>

<template>
  <AppContainer>
    <UCard class="mt-8">
      <p>{{ props.account.name }}</p>
      <div class="grid grid-cols-2 gap-6">
        <p>{{ props.account.type }}</p>
        <p>
          {{ formatAmount(props.account.balance ?? 0) }}
          {{ props.account.currency }}
        </p>
      </div>
      <p class="text-sm text-gray-600">{{ props.account.description }}</p>
      <div class="grid grid-cols-2 gap-6">
        <p class="text-xs text-gray-600">Order: {{ props.account.order }}</p>
        <p class="text-xs text-gray-600">
          Hidden: {{ props.account.hidden ? 'yes' : 'no' }}
        </p>
      </div>

      <div class="flex">
        <UButton class="mt-4 mr-3" size="xs" to="/">Home</UButton>
        <UButton class="mt-4 mr-3" size="xs" @click="emit('edit')">Edit</UButton>
        <UButton class="mt-4" size="xs" color="success" :to="`/account/${account.id}/daily`">Daily Spending</UButton>

        <NuxtLink :to="`/transaction/new?account=${account.id}`">
          <UButton class="mt-4 ml-3" size="xs">Add transaction</UButton>
        </NuxtLink>

        <UploadTransactionsToAccount :account="account" />

        <UButton icon="i-heroicons-arrow-down-tray" size="xs" class="mt-4 mx-1" @click="handleExportCsv">
          Export CSV
        </UButton>
      </div>
    </UCard>
  </AppContainer>
</template>

<style scoped></style>
