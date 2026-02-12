<script lang="ts" setup>
import { useRouter } from '#app';
import { useRoute } from '#imports';
import { useAccountStore } from '~/store/account';
import SingleAccountSummary from '~/components/account/SingleAccountSummary.vue';
import SingleAccountEdit from '~/components/account/SingleAccountEdit.vue';
import { useTransactionStore } from '~/store/transaction';

const route = useRoute();

const NEW_ACCOUNT_ID = 'new';

const accountId: string = String(route.params.id);
const accountStore = useAccountStore();
const transactionStore = useTransactionStore();

const showDebug = ref(false);
// Use computed to reactively fetch transactions from store
const debugTransactions = computed(() => 
  transactionStore.getAllByAccountId(accountId)
);

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
    
    <div class="mt-8 border-t pt-4">
        <UButton 
            size="2xs" 
            variant="ghost" 
            color="gray" 
            @click="showDebug = !showDebug"
        >
            {{ showDebug ? 'Hide Debug View' : 'Show Debug View' }}
        </UButton>
        <pre v-if="showDebug" class="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-96">
{{ JSON.stringify(debugTransactions, null, 2) }}
        </pre>
    </div>
  </div>
  <div v-else>
    <p>Account {{ accountId }} not found</p>
  </div>
</template>

<style scoped></style>
