<script setup lang="ts">
import type { Transaction } from '~/store/transaction.model';
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
  <div>
    <!-- Title/Icon managed by UModal props via DialogRoot -->
    <p class="mb-4">Are you sure to create the following transactions:</p>

    <div class="overflow-y-auto max-h-60 border rounded p-2 mb-4">
      <table class="text-xs w-full text-left">
        <tbody>
          <tr v-for="(transaction, index) of transactions" :key="index">
            <td class="whitespace-nowrap font-bold pr-2">{{ transaction.date }}</td>
            <td class="text-gray-700 line-clamp-1 pr-2">{{ transaction.payee }}</td>
            <td :class="textColorByAmount(transaction.amount)" class="whitespace-nowrap font-bold text-right">
              {{ formatAmount(transaction.amount ?? 0) }} {{ account.currency }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UButton class="w-full justify-center" color="neutral" @click.stop="cancel">Cancel
      </UButton>
      <UButton class="w-full justify-center" color="neutral" @click.stop="confirm">Ok
      </UButton>
    </div>
  </div>
</template>

<style scoped></style>
