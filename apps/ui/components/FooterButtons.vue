<script lang="ts" setup>
import { useAccountStore } from '~/store/account';
import SettingsButtonOptionsList from '~/components/menu/SettingsButtonOptionsList.vue';
import AppContainer from '~/components/shared/AppContainer.vue';

// function toggleSearch() {
//   // TODO: add search
//   alert('search not implemented');
// }

const accountsStore = useAccountStore();
</script>

<template>
  <AppContainer class="my-2">
    <div class="justify-between flex">
      <NuxtLink v-if="accountsStore.accounts.length" to="/transaction/new">
        <UButton color="neutral" icon="i-heroicons-plus" />
      </NuxtLink>
      <!--      <NuxtLink to="/budgets">-->
      <!--        <UButton color="neutral" icon="i-heroicons-briefcase" />-->
      <!--      </NuxtLink>-->
      <!--      <NuxtLink to="/schedules">-->
      <!--        <UButton color="neutral" icon="i-heroicons-calendar-days" />-->
      <!--      </NuxtLink>-->
      <!--      <UButton-->
      <!--        color="neutral"-->
      <!--        icon="i-heroicons-magnifying-glass"-->
      <!--        @click="toggleSearch"-->
      <!--      />-->
      <!--      <NuxtLink to="/reports">-->
      <!--        <UButton color="neutral" icon="i-heroicons-chart-pie" />-->
      <!--      </NuxtLink>-->
      <SettingsButtonOptionsList>
        <UButton color="neutral" icon="i-heroicons-ellipsis-vertical" />
      </SettingsButtonOptionsList>
    </div>
  </AppContainer>
</template>

<style scoped></style>
