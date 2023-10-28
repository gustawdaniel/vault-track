<script lang="ts" setup>
import {
  type ExtendedFullTransaction,
  prepareTransactionsToDisplay,
  type TransactionFilter,
} from '~/utils/prepareTransactionsToDisplay';
import { useTransactionStore } from '~/store/transaction';
import ContextMenu from '~/components/menu/ContextMenu.vue';
import { textColorByAmount } from '~/utils/textColorByAmount';
import { formatAmount } from '~/utils/formatAmount';

// const activityItems = [
//   {
//     user: {
//       name: 'Michael Foster',
//       imageUrl:
//         'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
//     },
//     projectName: 'ios-app',
//     commit: '2d89f0c8',
//     branch: 'main',
//     date: '1h',
//     dateTime: '2023-01-23T11:00',
//   },
//   // More items...
// ];

const props = defineProps<{ filter?: TransactionFilter }>();
const transactionStore = useTransactionStore();

const transactions = computed<ExtendedFullTransaction[]>(
  (): ExtendedFullTransaction[] => {
    return prepareTransactionsToDisplay(
      transactionStore.transactions,
      props.filter ?? {},
    );
  },
);
</script>

<template>
  <aside
    v-if="filter?.accountId"
    class="bg-gray-100 lg:fixed lg:bottom-0 lg:right-0 lg:top-16 lg:w-96 lg:overflow-y-auto lg:border-l lg:border-white/5"
  >
    <header
      class="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
    >
      <h2 class="text-base font-semibold leading-7">Transactions</h2>
      <NuxtLink
        v-if="filter.accountId"
        :to="`/account/${filter.accountId}`"
        class="text-sm font-semibold leading-6 text-indigo-400"
        href="#"
      >
        View all
      </NuxtLink>
    </header>
    <ul class="divide-y divide-white/5" role="list">
      <li
        v-for="transaction in transactions"
        :key="transaction.id"
        class="hover:bg-gray-50"
      >
        <ContextMenu
          :id="transaction.id"
          class="px-4 py-4 sm:px-6 lg:px-8"
          resource="transaction"
        >
          <NuxtLink :to="`/transaction/${transaction.id}`">
            <div class="flex items-center gap-x-3">
              <!--          <img-->
              <!--            :src="item.user.imageUrl"-->
              <!--            alt=""-->
              <!--            class="h-6 w-6 flex-none rounded-full bg-gray-800"-->
              <!--          />-->
              <h3 class="flex-auto truncate text-sm font-semibold leading-6">
                {{ transaction.payee }}
              </h3>
              <time
                :datetime="transaction.date"
                class="flex-none text-xs text-gray-600"
                >{{ transaction.date }}
              </time>
            </div>
            <div class="flex justify-between">
              <p class="mt-3 truncate text-sm text-gray-500">
                <span class="text-gray-400">{{ transaction.memo }}</span>
                <span class="font-mono text-gray-400">
                  {{ transaction.category }}
                </span>
              </p>
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
            </div>
          </NuxtLink>
        </ContextMenu>
      </li>
    </ul>
  </aside>
</template>

<style scoped></style>
