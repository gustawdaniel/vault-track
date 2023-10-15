<script lang="ts" setup>
import { ref } from 'vue';
import { FormError, FormSubmitEvent } from '#ui/types';
import dayjs from 'dayjs';
import { FullTransaction } from '~/store/transaction';
import { Account, useAccountStore } from '~/store/account';
import { useCategoryStore } from '~/store/category';
import { getRandomColor } from '~/utils/getRandomColor';

const props = defineProps<{
  transaction: FullTransaction;
}>();

type TransferContext = {
  type: 'transfer';
};
type NormalTransactionContext = Pick<
  FullTransaction,
  'category' | 'accountId'
> & {
  absoluteAmount: number;
  type: 'expense' | 'income';
};
type CommonTransactionContext = Pick<FullTransaction, 'payee' | 'date'>;

type TransactionContext = CommonTransactionContext &
  (NormalTransactionContext | TransferContext);

function isTransfer(transaction: Pick<FullTransaction, 'category'>): boolean {
  return Boolean(
    transaction.category &&
      transaction.category.startsWith('[') &&
      transaction.category.endsWith(']'),
  );
}

function transactionToContext(
  transaction: FullTransaction,
): TransactionContext {
  const common: CommonTransactionContext = {
    payee: transaction.payee,
    date: transaction.date,
  };

  if (isTransfer(transaction)) {
    return {
      ...common,
      type: 'transfer',
    };
  } else {
    return {
      ...common,
      type: transaction.amount > 0 ? 'income' : 'expense',
      category: transaction.category,
      absoluteAmount: Math.abs(transaction.amount),
      accountId: transaction.accountId,
    };
  }
}

const state = ref<TransactionContext>(transactionToContext(props.transaction));

const validate = (state: any): FormError[] => {
  return [];
};

function submit(event: FormSubmitEvent<any>) {
  console.log(event);
}

const accounts = computed<Array<Pick<Account, 'id' | 'name' | 'currency'>>>(
  () => {
    const accountStore = useAccountStore();
    return accountStore.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      currency: a.currency,
    }));
  },
);
// TODO: sync account id

const currentAccount = computed<Pick<Account, 'id' | 'name'> | undefined>(
  () => {
    return accounts.value.find(
      (account) =>
        'accountId' in state.value && account.id === state.value.accountId,
    );
  },
);

function setAccount(value: string): void {
  if ('accountId' in state.value) {
    state.value.accountId = value;
  }
  // const account = accounts.value.find(
  //   (account) => account.id === state.value.accountId,
  // );
  // if (account) {
  //   state.value.account = account.name;
  // }
}

const date = computed<Date>({
  get() {
    return dayjs(state.value.date).toDate();
  },
  set(date) {
    state.value.date = dayjs(date).format('YYYY-MM-DDT00:00:00');
  },
});
const dateLabel = computed(() =>
  date.value.toLocaleDateString('pl', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }),
);

export type TransferContextType = 'expense' | 'income' | 'transfer';

const types: Array<{
  id: TransferContextType;
  name: string;
}> = [
  { id: 'expense', name: 'Expense' },
  { id: 'income', name: 'Income' },
  { id: 'transfer', name: 'Transfer' },
];

function setType(value: TransferContextType): void {
  state.value.type = value;
}

function ucFirst(word: string): string {
  if (!word) return '';
  return word.substring(0, 1).toUpperCase() + word.substring(1);
}

const categoryStore = useCategoryStore();

function setCategory(
  value:
    | string
    | {
        category: string;
      },
): void {
  if (state.value.type === 'income' || state.value.type === 'expense') {
    if (typeof value === 'string') {
      state.value.category = value;
    } else {
      categoryStore.create({ category: value.category });
      state.value.category = value.category;
    }
  }
}
</script>

<template>
  <div class="grid gap-6 grid-cols-2">
    <pre>{{ props.transaction }}</pre>
    <pre>{{ state }}</pre>
  </div>

  <UContainer>
    <UCard class="h-screen">
      <UForm :state="state" :validate="validate" @submit="submit">
        <UFormGroup label="Payee/Item" name="payee">
          <UInput v-model="state.payee" />
        </UFormGroup>

        <div class="grid gap-6 grid-cols-2">
          <UFormGroup label="Account" name="account">
            <USelectMenu
              :model-value="state.accountId"
              :options="accounts"
              option-attribute="name"
              searchable
              value-attribute="id"
              @update:model-value="setAccount"
            >
              <template #label>
                {{ currentAccount ? currentAccount.name : 'Unknown' }}
              </template>
            </USelectMenu>
          </UFormGroup>

          <UFormGroup label="Date" name="date">
            <UPopover :popper="{ placement: 'bottom-start' }">
              <UInput
                :model-value="dateLabel"
                class="w-full"
                icon="i-heroicons-calendar-days-20-solid"
              />
              <template #panel="{ close }">
                <DatePicker v-model="date" @close="close" />
              </template>
            </UPopover>
          </UFormGroup>
        </div>

        <div class="grid gap-6 grid-cols-2">
          <UFormGroup
            :label="`Amount  ${
              currentAccount ? '(' + currentAccount.currency + ')' : ''
            }`"
            name="amount"
          >
            <UInput
              v-model.number="state.absoluteAmount"
              class="text-right font-bold"
              icon="i-heroicons-calculator-20-solid"
            >
              <template v-if="currentAccount" #trailing>
                <span class="text-gray-500 dark:text-gray-400 text-xs">
                  {{ currentAccount.currency }}
                </span>
              </template>
            </UInput>
          </UFormGroup>
          <UFormGroup label="Type" name="type">
            <USelectMenu
              :model-value="state.type"
              :options="types"
              option-attribute="name"
              value-attribute="id"
              @update:model-value="setType"
            >
              <template #label>
                {{ ucFirst(state.type) }}
              </template>
            </USelectMenu>
          </UFormGroup>
        </div>

        <div class="grid gap-6 grid-cols-2">
          <UFormGroup label="Category" name="category">
            <USelectMenu
              :model-value="state.category"
              :options="categoryStore.categories"
              by="category"
              creatable
              option-attribute="category"
              searchable
              value-attribute="category"
              @update:model-value="setCategory"
            >
              <template #label>
                <template v-if="state.category">
                  <span class="flex items-center -space-x-1">
                    <span
                      :style="{
                        background: `${categoryStore.getColorByCategory(
                          state.category,
                        )}`,
                      }"
                      class="flex-shrink-0 w-2 h-2 mt-px rounded-full"
                    />
                  </span>
                  <span>{{ state.category }}</span>
                </template>
                <template v-else>
                  <span class="text-gray-500 dark:text-gray-400 truncate">
                    Select category
                  </span>
                </template>
              </template>
              <template #option="{ option }">
                <span
                  :style="{ background: `${option.color}` }"
                  class="flex-shrink-0 w-2 h-2 mt-px rounded-full"
                />
                <span class="truncate">{{ option.category }}</span>
              </template>
              <template #option-create="{ option }">
                <span class="flex-shrink-0">New category:</span>
                <span
                  :style="{
                    background: `${getRandomColor()}`,
                  }"
                  class="flex-shrink-0 w-2 h-2 mt-px rounded-full -mx-1"
                />
                <span class="block truncate">{{ option.category }}</span>
              </template>
            </USelectMenu>
          </UFormGroup>
        </div>
      </UForm>
    </UCard>
  </UContainer>
</template>
