<script lang="ts" setup>
import type { ComputedAccount } from '~/store/account';
import { formatAmount } from '~/utils/formatAmount';
import AppContainer from '~/components/shared/AppContainer.vue';
import UploadTransactionsToAccount from '~/components/account/UploadTransactionsToAccount.vue';

const props = defineProps<{
  account: ComputedAccount;
}>();

const emit = defineEmits(['edit']);
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
        <UButton class="mt-4" size="xs" @click="emit('edit')">Edit</UButton>

        <NuxtLink :to="`/transaction/new?account=${account.id}`">
          <UButton class="mt-4 ml-3" size="xs">Add transaction</UButton>
        </NuxtLink>

        <UploadTransactionsToAccount :account="account" />
      </div>
    </UCard>
  </AppContainer>
</template>

<style scoped></style>
