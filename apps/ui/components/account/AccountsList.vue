<script lang="ts" setup>
import { useAccountStore, type Account } from '~/store/account';
import AccountTypeIcon from '~/components/icons/AccountTypeIcon.vue';
import { formatAmount } from '~/utils/formatAmount';
import ContextMenu from '~/components/menu/ContextMenu.vue';
import { textColorByAmount } from '~/utils/textColorByAmount';
import AppContainer from '~/components/shared/AppContainer.vue';
import draggable from 'vuedraggable';

const accountStore = useAccountStore();

const visibleAccounts = computed({
  get() {
    return accountStore.sortedAccounts.filter((acc) =>
      accountStore.showHidden ? true : !acc.hidden,
    );
  },
  set(value: Account[]) {
    accountStore.reorder(value);
  },
});


</script>

<template>
  <AppContainer>
    <draggable v-model="visibleAccounts" tag="ul" item-key="id" class="list-group" handle=".drag-handle">
      <template #item="{ element: account }">
        <li>
          <ContextMenu :id="account.id" resource="account">
            <NuxtLink :to="`/account/${account.id}`" class="flex justify-between items-center">
              <div class="m-2 shrink-0 flex items-center">
                <UIcon name="i-heroicons-bars-3" class="w-5 h-5 mr-2 text-gray-400 cursor-grab drag-handle" />
                <div class="basis-10 w-10 shrink-0">
                  <AccountTypeIcon :type="account.type" />
                </div>
              </div>
              <div class="m-2 flex-grow text-left overflow-auto">
                <p class="font-bold">{{ account.name }}</p>
                <p class="text-sm text-gray-600">
                  {{ account.description ?? '' }}
                </p>
              </div>
              <div :class="textColorByAmount(account.balance ?? 0)" class="m-2 font-bold">
                {{ formatAmount(account.balance ?? 0) }}
                {{ account.currency ?? 'USD' }}
              </div>
            </NuxtLink>
          </ContextMenu>
        </li>
      </template>
    </draggable>
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
