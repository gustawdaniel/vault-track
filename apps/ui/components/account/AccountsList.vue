<script lang="ts" setup>
import { useAccountStore } from '~/store/account';
import AccountTypeIcon from '~/components/icons/AccountTypeIcon.vue';
import { formatAmount } from '~/utils/formatAmount';
import ContextMenu from '~/components/menu/ContextMenu.vue';
import { textColorByAmount } from '~/utils/textColorByAmount';
import AppContainer from '~/components/shared/AppContainer.vue';

const accountStore = useAccountStore();

// TODO: switch
const showHiddenAccounts = ref<boolean>(false);
</script>

<template>
  <AppContainer>
    <ul>
      <li
        v-for="account of accountStore.accounts.filter((acc) =>
          showHiddenAccounts ? true : !acc.hidden,
        )"
        :key="account.name"
      >
        <ContextMenu :id="account.id" resource="account">
          <NuxtLink
            :to="`/account/${account.id}`"
            class="flex justify-between items-center"
          >
            <div class="m-2 basis-10 w-10 shrink-0">
              <AccountTypeIcon :type="account.type" />
            </div>
            <div class="m-2 flex-grow text-left overflow-auto">
              <p class="font-bold">{{ account.name }}</p>
              <p class="text-sm text-gray-600">
                {{ account.description ?? '' }}
              </p>
            </div>
            <div
              :class="textColorByAmount(account.balance ?? 0)"
              class="m-2 font-bold"
            >
              {{ formatAmount(account.balance ?? 0) }}
              {{ account.currency ?? 'USD' }}
            </div>
          </NuxtLink>
        </ContextMenu>
      </li>
    </ul>
  </AppContainer>
</template>

<style scoped>
/* width */
::-webkit-scrollbar {
  height: 1px;
}

/* Track */
::-webkit-scrollbar-track {
  background: #888;
}

/* Handle */
::-webkit-scrollbar-thumb {
  background: #000;
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
