<script lang="ts" setup>
import { useRoute } from '#imports';
import { useAccountStore } from '~/store/account';
import SingleAccountSummary from '~/components/account/SingleAccountSummary.vue';
import SingleAccountEdit from '~/components/account/SingleAccountEdit.vue';

const route = useRoute();

const accountId: string = String(route.params.id);
const accountStore = useAccountStore();

const account = accountStore.getById(accountId);

const mode = ref<'show' | 'edit'>('show');
</script>

<template>
  <div v-if="account">
    <SingleAccountSummary
      v-if="mode === 'show'"
      :account="account"
      @edit="mode = 'edit'"
    />
    <SingleAccountEdit
      v-if="mode === 'edit'"
      :account="account"
      @submit="mode = 'show'"
    />

    <TransactionsList :filter="{ accountId }" />
  </div>
  <div v-else>
    <p>Account {{ accountId }} not found</p>
  </div>
</template>

<style scoped></style>
