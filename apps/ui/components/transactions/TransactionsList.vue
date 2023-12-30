<script lang="ts" setup>
import { useTransactionStore } from '~/store/transaction';
import { getFullCategoryName } from '~/store/category';

import CategoryColorBox from '~/components/transactions/CategoryColorBox.vue';
import { textColorByAmount } from '~/utils/textColorByAmount';
import { formatAmount } from '~/utils/formatAmount';
import ContextMenu from '~/components/menu/ContextMenu.vue';
import {
  type ExtendedFullTransaction,
  prepareTransactionsToDisplay,
  type TransactionFilter,
} from '~/utils/prepareTransactionsToDisplay';
import AppContainer from '~/components/shared/AppContainer.vue';

const transactionStore = useTransactionStore();

const props = defineProps<{ filter?: TransactionFilter }>();

const transactions = computed<ExtendedFullTransaction[]>(
  (): ExtendedFullTransaction[] => {
    return prepareTransactionsToDisplay(
      transactionStore.transactions,
      props.filter ?? {},
    );
  },
);

const route = useRoute();

const selectedIds = ref<string[]>([]);

function toggleSelection(id: string): void {
  const idIndex = selectedIds.value.findIndex(
    (selectedId) => selectedId === id,
  );
  if (idIndex === -1) {
    selectedIds.value.push(id);
  } else {
    selectedIds.value.splice(idIndex, 1);
  }
}
</script>

<template>
  <AppContainer v-if="transactions.length" class="mt-6">
    <UCard>
      <!--      <pre v-if="transactions.length">{{ transactions[0] }}</pre>-->
      <ul>
        <li
          v-for="(transaction, index) of transactions.slice().reverse()"
          :id="transaction.id"
          :key="index"
          :class="{
            'border-green-300 border bg-green-100':
              route.hash === '#' + transaction.id,
            'bg-indigo-100': selectedIds.includes(transaction.id),
          }"
        >
          <ContextMenu :id="transaction.id" resource="transaction">
            <div class="flex justify-between items-start my-1">
              <DateView
                :date="transaction.date"
                class="w-16 cursor-pointer"
                @click="toggleSelection(transaction.id)"
              />
              <NuxtLink
                :to="`/transaction/${transaction.id}`"
                class="flex-grow flex justify-between items-start"
              >
                <CategoryColorBox
                  :color="transaction.color"
                  :extended="!props.filter?.accountId"
                />
                <div class="flex-grow ml-2 w-10 shrink-0">
                  <p v-if="!props.filter?.accountId" class="text-xs">
                    {{ transaction.account }}
                  </p>
                  <p class="font-bold">
                    {{ transaction.payee || transaction.memo }}
                  </p>
                  <p class="text-xs">
                    {{ getFullCategoryName(transaction) }}
                  </p>
                </div>
                <div class="text-right shrink-0">
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
            </div>
          </ContextMenu>
        </li>
      </ul>
    </UCard>
  </AppContainer>
</template>

<style scoped></style>
