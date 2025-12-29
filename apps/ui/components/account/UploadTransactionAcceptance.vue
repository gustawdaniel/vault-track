<script setup lang="ts">
import { uid } from 'uid';
import type { ComputedAccount } from '~/store/account';
import type { FullTransaction, Transaction } from '~/store/transaction';
import { useTransactionStore } from '~/store/transaction';
import { toShortDate } from '~/utils/date';
import { formatAmount } from '~/utils/formatAmount';
import { textColorByAmount } from '~/utils/textColorByAmount';
import ConfirmBulkTransactionsCreate from '~/components/dialog/ConfirmBulkTransactionsCreate.vue';
import { useDialog } from '~/store/dialog';

const props = defineProps<{
  account: ComputedAccount;
  transactionsToImport: Transaction[];
}>();

const emit = defineEmits(['close']);

const transactionStore = useTransactionStore();

// console.log(transactionStore.transactions);

const transactionTimeline = ref<
  Map<
    string,
    (Transaction & { id: string; excluded: boolean; hash?: string })[]
  >
>(
  new Map<
    string,
    (Transaction & { id: string; excluded: boolean; hash?: string })[]
  >(),
);

function setupTransactionTimeline(): void {
  const map = new Map<
    string,
    (Transaction & { id: string; excluded: boolean; hash?: string })[]
  >();

  [
    ...props.transactionsToImport,
    ...transactionStore.getAllByAccountId(props.account.id),
  ].forEach((transaction: FullTransaction | Transaction) => {
    if (/^\d{4}-\d{2}-\d{2}/.test(transaction.date)) {
      const transactionsInThisGroup =
        map.get(toShortDate(transaction.date)) ?? [];

      const exisingIndex = transactionsInThisGroup.findIndex(
        (t) =>
          t.amount === transaction.amount &&
          Boolean(transaction.hash) !== Boolean(t.hash) &&
          !t.excluded,
      );

      const transactionWithExclusionMark: Transaction & {
        id: string;
        excluded: boolean;
      } = {
        ...transaction,
        excluded: false,
        id: 'id' in transaction ? transaction.id : uid(),
      };

      if (exisingIndex >= 0) {
        transactionsInThisGroup[exisingIndex].excluded = true;
        transactionWithExclusionMark.excluded = true;
      }

      // console.log(transactionWithExclusionMark.date.startsWith('2023-05-08'));

      if (
        transactionWithExclusionMark.amount === 500 &&
        transactionWithExclusionMark.date.startsWith('2023-05-08')
      ) {
        console.log(`1`, transactionWithExclusionMark);
      }
      map.set(
        toShortDate(transaction.date),
        transactionsInThisGroup.concat(transactionWithExclusionMark),
      );
    }
  });

  transactionTimeline.value = map;
}

onMounted(setupTransactionTimeline);

function toggleExclusion(date: string, id: string) {
  const trxOnDate = transactionTimeline.value.get(date);
  if (trxOnDate) {
    const trx = trxOnDate.find((t) => t.id === id);
    if (trx) {
      trx.excluded = !trx.excluded;
    }
  }
}

const showExcluded = ref<boolean>(true);

function importTransactions() {
  const transactions: Transaction[] = [];
  for (const [, transactionsOfDay] of transactionTimeline.value.entries()) {
    transactions.push(
      ...transactionsOfDay.filter((t) => !t.excluded && !t.hash),
    );
  }

  console.log(transactions);

  function onConfirm() {
    emit('close');
  }

  const dialog = useDialog();
  dialog.openDialog(ConfirmBulkTransactionsCreate, {
    transactions,
    account: props.account,
    onConfirm,
  });
}
</script>

<template>
  <div>
    <UFormField label="Show/Hide excluded">
      <USwitch v-model="showExcluded" color="primary" />
    </UFormField>

    <div class="grid grid-cols-2 gap-2">
      <div class="text-center font-bold">Existing transactions</div>
      <div class="text-center font-bold">Transactions to import</div>
    </div>

    <div
      v-for="[day, transactionsOfDay] of [...transactionTimeline.entries()]
        .filter(
          ([, transactions]) =>
            showExcluded || transactions.some((t) => !t.excluded),
        )
        .sort((a, b) => b[0].localeCompare(a[0]))"
      :key="day"
      class="grid grid-cols-2 gap-2"
    >
      <div class="col-span-2 text-center text-gray-500 text-xs">
        {{ day }}
      </div>
      <div>
        <div
          v-for="(transaction, index) of transactionsOfDay
            .filter((t) => 'hash' in t && (showExcluded || !t.excluded))
            .sort((a, b) => a.amount - b.amount)"
          :key="index"
        >
          <div
            class="flex justify-between"
            :class="transaction.excluded ? 'bg-gray-100' : ''"
          >
            <div
              class="text-xs"
              :class="transaction.excluded ? 'text-gray-400' : 'text-gray-600'"
            >
              <div>
                {{ transaction.payee }}
                <span v-if="transaction.memo" class="text-gray-400">/</span>
                {{ transaction.memo }}
              </div>
              <div>{{ transaction.category }}</div>
            </div>
            <div
              :style="
                transaction.excluded
                  ? `filter: brightness(150%) grayscale(80%)`
                  : ''
              "
              class="whitespace-nowrap font-bold"
              :class="textColorByAmount(transaction.amount)"
            >
              {{ formatAmount(transaction.amount ?? 0) }} {{ account.currency }}
              <UButton
                label="x"
                title="Exclude / Include"
                color="neutral"
                size="xs"
                class="m-0 px-1 py-0"
                @click="
                  toggleExclusion(toShortDate(transaction.date), transaction.id)
                "
              />
            </div>
          </div>

          <!--          {{ transaction }}-->
        </div>
      </div>
      <div>
        <div
          v-for="(transaction, index) of transactionsOfDay
            .filter((t) => !('hash' in t) && (showExcluded || !t.excluded))
            .sort((a, b) => a.amount - b.amount)"
          :key="index"
        >
          <div
            class="flex justify-between"
            :class="transaction.excluded ? 'bg-gray-100' : ''"
          >
            <div
              class="text-xs"
              :class="transaction.excluded ? 'text-gray-400' : 'text-gray-600'"
            >
              <div>
                {{ transaction.payee }}
                <span v-if="transaction.memo" class="text-gray-400">/</span>
                {{ transaction.memo }}
              </div>
              <div>{{ transaction.category }}</div>
            </div>
            <div
              :style="
                transaction.excluded
                  ? `filter: brightness(150%) grayscale(80%)`
                  : ''
              "
              class="whitespace-nowrap font-bold"
              :class="textColorByAmount(transaction.amount)"
            >
              {{ formatAmount(transaction.amount ?? 0) }} {{ account.currency }}
              <UButton
                label="x"
                title="Exclude / Include"
                color="neutral"
                size="xs"
                class="m-0 px-1 py-0"
                @click="
                  toggleExclusion(toShortDate(transaction.date), transaction.id)
                "
              />
            </div>
          </div>

          <!--          {{ transaction }}-->
        </div>
      </div>
      <div class="col-span-2 mb-2">
        <hr />
      </div>
    </div>

    <UButton label="Import transactions" block @click="importTransactions" />

    <!--    <pre>{{ transactionTimeline }}</pre>-->
  </div>
</template>

<style scoped></style>
