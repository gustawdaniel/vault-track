<script lang="ts" setup>
import HoveredSelectableOptionsList, {
  MenuOption,
} from '~/components/menu/HoveredSelectableOptionsList.vue';
import { useRouter } from '#imports';
import { useAccountStore } from '~/store/account';

// function toggleSearch() {
//   // TODO: add search
//   alert('search not implemented');
// }

const options: MenuOption[] = [
  {
    id: 'open-account',
    name: 'New Account',
    click: () => {
      const router = useRouter();
      router.push(`/account/new?edit=1`);
    },
  },
  {
    id: 'database',
    name: 'Database',
    click: () => {
      const router = useRouter();
      router.push(`/backup`);
    },
  },
  {
    id: 'preferences',
    name: 'Preferences',
    click: () => {
      const router = useRouter();
      router.push('/preferences');
    },
  },
];

const accountsStore = useAccountStore();
</script>

<template>
  <UContainer class="my-2">
    <div class="justify-between flex">
      <NuxtLink v-if="accountsStore.accounts.length" to="/transaction/new">
        <UButton color="gray" icon="i-heroicons-plus" />
      </NuxtLink>
      <!--      <NuxtLink to="/budgets">-->
      <!--        <UButton color="gray" icon="i-heroicons-briefcase" />-->
      <!--      </NuxtLink>-->
      <!--      <NuxtLink to="/schedules">-->
      <!--        <UButton color="gray" icon="i-heroicons-calendar-days" />-->
      <!--      </NuxtLink>-->
      <!--      <UButton-->
      <!--        color="gray"-->
      <!--        icon="i-heroicons-magnifying-glass"-->
      <!--        @click="toggleSearch"-->
      <!--      />-->
      <!--      <NuxtLink to="/reports">-->
      <!--        <UButton color="gray" icon="i-heroicons-chart-pie" />-->
      <!--      </NuxtLink>-->
      <UPopover>
        <UButton color="gray" icon="i-heroicons-ellipsis-vertical" />
        <template #panel>
          <HoveredSelectableOptionsList :options="options" />
        </template>
      </UPopover>
    </div>
  </UContainer>
</template>

<style scoped></style>
