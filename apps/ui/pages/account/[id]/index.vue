<script lang="ts" setup>
import { useRouter } from '#app';
import { useRoute } from '#imports';
import { useAccountStore } from '~/store/account';
import SingleAccountSummary from '~/components/account/SingleAccountSummary.vue';
import SingleAccountEdit from '~/components/account/SingleAccountEdit.vue';

const route = useRoute();

const NEW_ACCOUNT_ID = 'new';

const accountId: string = String(route.params.id);
const accountStore = useAccountStore();

const account = computed(() =>
  accountId === NEW_ACCOUNT_ID
    ? accountStore.getNew()
    : accountStore.getById(accountId)
);

const mode = ref<'show' | 'edit'>(route.query.edit === '1' ? 'edit' : 'show');

function onAccountEditOrCreate(id?: string) {
  mode.value = 'show';

  if (typeof id === 'string') {
    const router = useRouter();
    router.push(`/account/${id}`);
  } else if (accountId === NEW_ACCOUNT_ID) {
    const router = useRouter();
    router.push(`/`);
  }
}
</script>

<template>
  <div v-if="account">
    <SingleAccountSummary v-if="mode === 'show'" :account="account" @edit="mode = 'edit'" />
    <SingleAccountEdit v-if="mode === 'edit'" :account="account" @submit="onAccountEditOrCreate" />

    <TransactionsList :filter="{ accountId }" />
  </div>
  <div v-else>
    <p>Account {{ accountId }} not found</p>
  </div>
</template>

<style scoped></style>
