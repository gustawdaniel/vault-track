<script lang="ts" setup>
import { useAccountStore } from '~/store/account';
import SettingsButtonOptionsList from '~/components/menu/SettingsButtonOptionsList.vue';

// function toggleSearch() {
//   // TODO: add search
//   alert('search not implemented');
// }

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
      <SettingsButtonOptionsList>
        <UButton color="gray" icon="i-heroicons-ellipsis-vertical" />
      </SettingsButtonOptionsList>
    </div>
  </UContainer>
</template>

<style scoped></style>
