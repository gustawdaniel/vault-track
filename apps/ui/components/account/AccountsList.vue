<script lang="ts" setup>
import { useAccountStore } from '~/store/account';
import AccountTypeIcon from '~/components/icons/AccountTypeIcon.vue';
import { formatAmount } from '~/utils/formatAmount';
import ContextMenu from '~/components/menu/ContextMenu.vue';

const accountStore = useAccountStore();
</script>

<template>
  <UContainer>
    <ul>
      <li v-for="account of accountStore.accounts" :key="account.name">
        <ContextMenu :id="account.id" resource="account">
          <NuxtLink
            :to="`/account/${account.id}`"
            class="flex justify-between items-center"
          >
            <div class="m-2 w-10">
              <AccountTypeIcon :type="account.type" />
            </div>
            <div class="m-2 flex-grow text-left">
              <p class="font-bold">{{ account.name }}</p>
              <p class="text-sm text-gray-600">
                {{ account.description ?? '' }}
              </p>
            </div>
            <div class="m-2 font-bold">
              {{ formatAmount(account.balance ?? 0) }}
              {{ account.currency ?? 'USD' }}
            </div>
          </NuxtLink>
        </ContextMenu>
      </li>
    </ul>
  </UContainer>
</template>

<style scoped></style>
