<script lang="ts" setup>
import { useAccountStore } from '~/store/account';

const accountStore = useAccountStore();
</script>

<template>
  <UContainer>
    <ul>
      <li
        v-for="account of accountStore.accounts"
        :key="account.name"
        class="bg-red-200 flex justify-between items-center"
      >
        <div class="m-2 w-10">{{ account.type }}</div>
        <div class="m-2 flex-grow text-left">
          <p>{{ account.name }} / {{ account }}</p>
          <p>{{ account.description ?? 'xxx' }}</p>
        </div>
        <div class="m-2">
          {{ account.sum ?? 0 }} {{ account.currency ?? 'USD' }}
        </div>
      </li>
    </ul>
  </UContainer>
</template>

<style scoped></style>
