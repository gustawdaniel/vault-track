<script lang="ts" setup>
import { useAccountStore } from '~/store/account';
import { useCategoryStore } from '~/store/category';
import { useTransactionStore } from '~/store/transaction';
// import { useProjectStore } from '~/store/project';

const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const transactionStore = useTransactionStore();
// const projectStore = useProjectStore();

// function computeBalance() {
//   accountStore.computeAllBalances();
// }

interface SingleStat {
  name: string;
  stat: number;
}

const stats = computed<SingleStat[]>(() => [
  { name: 'Accounts', stat: accountStore.accounts.length },
  { name: 'Transactions', stat: transactionStore.transactions.length },
  { name: 'Categories', stat: categoryStore.categories.length },
  // { name: 'Projects', stat: projectStore.projects.length },
]);
</script>

<template>
  <UContainer>
    <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
      <div
        v-for="item in stats"
        :key="item.name"
        class="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6"
      >
        <dt class="truncate text-sm font-medium text-gray-500">
          {{ item.name }}
        </dt>
        <dd class="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
          {{ item.stat }}
        </dd>
      </div>
    </dl>
  </UContainer>

  <!--  <div v-if="false">-->
  <!--    <p>Cat: {{}} | Acc: {{}} | Trx: {{}}</p>-->
  <!--    <button class="border" @click="computeBalance">Compute balance</button>-->
  <!--  </div>-->
</template>

<style scoped></style>
