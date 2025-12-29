<script setup lang="ts">
import type { Transaction } from '~/store/transaction';
import type { Account } from '~/store/account';
import { useDialog } from '~/store/dialog';
import { useTransactionStore } from '~/store/transaction';
import { useAccountStore } from '~/store/account';
import { formatAmount } from '~/utils/formatAmount';
import { textColorByAmount } from '~/utils/textColorByAmount';

const props = defineProps<{
  transactions: Transaction[];
  account: Account;
}>();

const dialog = useDialog();

function cancel() {
  dialog.closeDialog();
}

function confirm() {
  const transactionStore = useTransactionStore();
  for (const transaction of props.transactions) {
    transactionStore.create(transaction);
  }

  const accountStore = useAccountStore();
  accountStore.computeBalanceById(props.account.id);

  dialog.closeDialog();
  const toast = useToast();
  toast.add({
    title: `All transactions was created`,
  });
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="flex items-center">
        <i class="i-heroicons-exclamation-triangle w-5 h-5 mr-2" />
        <span>Create {{ transactions.length }} transactions</span>
      </h1>
    </template>

    <p class="mb-2">Are you sure to create the following transactions:</p>

    <table class="text-xs">
      <tbody>
        <tr v-for="(transaction, index) of transactions" :key="index">
          <td class="whitespace-nowrap font-bold">{{ transaction.date }}</td>
          <td class="text-gray-700 line-clamp-1">{{ transaction.payee }}</td>
          <td
            :class="textColorByAmount(transaction.amount)"
            class="whitespace-nowrap font-bold text-right"
          >
            {{ formatAmount(transaction.amount ?? 0) }} {{ account.currency }}
          </td>
        </tr>
      </tbody>
    </table>

    <template #footer>
      <div class="grid grid-cols-2 gap-4">
        <UButton class="w-full justify-center" color="neutral" @click.stop="cancel"
          >Cancel
        </UButton>
        <UButton
          class="w-full justify-center"
          color="neutral"
          @click.stop="confirm"
          >Ok
        </UButton>
      </div>
    </template>
  </UCard>
</template>

<style scoped></style>
