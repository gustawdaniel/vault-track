<script lang="ts" setup>
import { ChevronRightIcon } from '@heroicons/vue/20/solid';
import { useAccountStore } from '~/store/account';
import { textColorByAmount } from '~/utils/textColorByAmount';
import { formatAmount } from '~/utils/formatAmount';
import ContextMenu from '~/components/menu/ContextMenu.vue';

function classForAccountBalance(balance: number): string {
  if (balance === 0) return 'text-gray-500 bg-gray-100/10';
  return balance > 0
    ? 'text-green-400 bg-green-400/10'
    : 'text-rose-400 bg-rose-400/10';
}

const emit = defineEmits(['selectAccountId']);

const accountStore = useAccountStore();
</script>

<template>
  <main class="lg:pr-96">
    <header
      class="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
    >
      <h1 class="text-base font-semibold leading-7">Accounts</h1>
      <NuxtLink
        class="text-sm font-semibold leading-6 text-indigo-400"
        to="/account/new?edit=1"
        >New account
      </NuxtLink>
    </header>

    <!-- Deployment list -->
    <ul class="divide-y divide-white/5" role="list">
      <li
        v-for="account in accountStore.accounts"
        :key="account.id"
        @mouseenter="emit('selectAccountId', account.id)"
      >
        <ContextMenu :id="account.id" resource="account">
          <NuxtLink
            :to="`/account/${account.id}`"
            class="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8 hover:bg-gray-100"
          >
            <div class="min-w-0 flex-auto">
              <div class="flex items-center gap-x-3">
                <div
                  :class="[
                    classForAccountBalance(account.balance),
                    'flex-none rounded-full p-1',
                  ]"
                >
                  <div class="h-2 w-2 rounded-full bg-current" />
                </div>
                <h2 class="min-w-0 text-sm font-semibold leading-6">
                  <NuxtLink :to="`/account/${account.id}`" class="flex gap-x-2">
                    <span class="truncate">{{ account.name }}</span>
                    <span class="text-gray-400">/</span>
                    <span class="whitespace-nowrap">{{
                      account.currency
                    }}</span>
                    <span class="absolute inset-0" />
                  </NuxtLink>
                </h2>
              </div>
              <div
                class="mt-3 flex items-center gap-x-2.5 text-xs leading-5 text-gray-400"
              >
                <p class="truncate">{{ account.type }}</p>
                <svg
                  class="h-0.5 w-0.5 flex-none fill-gray-300"
                  viewBox="0 0 2 2"
                >
                  <circle cx="1" cy="1" r="1" />
                </svg>
                <p class="whitespace-nowrap">{{ account.description }}</p>
              </div>
            </div>
            <div
              :class="textColorByAmount(account.balance ?? 0)"
              class="m-2 font-bold"
            >
              {{ formatAmount(account.balance ?? 0) }}
              {{ account.currency ?? 'USD' }}
            </div>

            <ChevronRightIcon
              aria-hidden="true"
              class="h-5 w-5 flex-none text-gray-400"
            />
          </NuxtLink>
        </ContextMenu>
      </li>
    </ul>
  </main>
</template>

<style scoped></style>
