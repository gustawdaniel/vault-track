<script lang="ts" setup>
import { useTransactionStore } from '~/store/transaction';
import { getFullCategoryName } from '~/store/category';

import CategoryColorBox from '~/components/transactions/CategoryColorBox.vue';
import { textColorByAmount } from '~/utils/textColorByAmount';
import { formatAmount } from '~/utils/formatAmount';
import ContextMenu from '~/components/menu/ContextMenu.vue';
import {
  ExtendedFullTransaction,
  prepareTransactionsToDisplay,
  TransactionFilter,
} from '~/utils/prepareTransactionsToDisplay';

const transactionStore = useTransactionStore();

const props = defineProps<{ filter?: TransactionFilter }>();

const transactions = computed<ExtendedFullTransaction[]>(
  (): ExtendedFullTransaction[] => {
    return prepareTransactionsToDisplay(
      transactionStore.transactions,
      props.filter,
    );
  },
);
</script>

<template>
  <UContainer v-if="transactions.length" class="mt-6">
    <UCard>
      <!--      <pre v-if="transactions.length">{{ transactions[0] }}</pre>-->
      <ul>
        <li
          v-for="(transaction, index) of transactions.slice().reverse()"
          :key="index"
        >
          <ContextMenu :id="transaction.id" resource="transaction">
            <NuxtLink
              :to="`/transaction/${transaction.id}`"
              class="flex justify-between items-start my-1"
            >
              <DateView :date="transaction.date" class="w-16" />
              <CategoryColorBox
                :color="transaction.color"
                :extended="!props.filter?.accountId"
              />
              <div class="flex-grow ml-2">
                <p v-if="!props.filter?.accountId" class="text-xs">
                  {{ transaction.account }}
                </p>
                <p class="font-bold">{{ transaction.payee }}</p>
                <p class="text-xs">
                  {{ getFullCategoryName(transaction) }}
                </p>
              </div>
              <div class="text-right">
                <p
                  :class="textColorByAmount(transaction.amount)"
                  class="font-bold"
                >
                  {{ formatAmount(transaction.amount) }}
                  {{ transaction.currency }}
                </p>
                <p class="text-sm text-gray-700">
                  {{ formatAmount(transaction.accountSubBalance) }}
                  {{ transaction.currency }}
                </p>
              </div>
            </NuxtLink>
          </ContextMenu>
        </li>
      </ul>
    </UCard>
  </UContainer>
</template>

<style scoped></style>
