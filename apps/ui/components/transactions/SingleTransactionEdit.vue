<script lang="ts" setup>
import { ref } from 'vue';
import { FormError, FormSubmitEvent } from '#ui/types';
import {
  FullTransaction,
  Transaction,
  useTransactionStore,
} from '~/store/transaction';
import { Account, useAccountStore } from '~/store/account';
import CategoryPicker from '~/components/category/CategoryPicker.vue';
import AmountInput from '~/components/transactions/input/AmountInput.vue';
import AccountPicker from '~/components/transactions/input/AccountPicker.vue';
import DatePicker from '~/components/transactions/input/DatePicker.vue';
import TypePicker from '~/components/transactions/input/TypePicker.vue';
import ClearedStatusPicker from '~/components/transactions/input/ClearedStatusPicker.vue';
import {
  ClearedStatus,
  getClearedStatusFromString,
} from '~/store/clearedStatus';

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
  clearedStatus: ClearedStatus;
};
type CommonTransactionContext = Pick<
  FullTransaction,
  'payee' | 'date' | 'memo'
>;

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
    memo: transaction.memo,
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
      clearedStatus: getClearedStatusFromString(transaction.clearedStatus),
    };
  }
}

const state = ref<TransactionContext>(transactionToContext(props.transaction));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const validate = (state: any): FormError[] => {
  // TODO: add validation
  return [];
};

function getAmountFromNormalContext(data: NormalTransactionContext): number {
  switch (data.type) {
    case 'income':
      return data.absoluteAmount;
    case 'expense':
      return -data.absoluteAmount;
    default:
      return 0;
  }
}

function submit(event: FormSubmitEvent<TransactionContext>) {
  const updates = new Map<string, Transaction>();
  // eslint-disable-next-line no-console
  console.log(event.data);
  if (event.data.type === 'income' || event.data.type === 'expense') {
    // const transaction
    // updates.set(event.data.)
    const account = currentAccount.value;
    if (!account) {
      throw new Error(
        `Current account not found for id ${event.data.accountId}`,
      );
    }

    updates.set(props.transaction.id, {
      amount: getAmountFromNormalContext(event.data),
      accountId: event.data.accountId,
      account: account.name,
      date: event.data.date,
      memo: event.data.memo,
      category: event.data.category,
      payee: event.data.payee,
      clearedStatus: event.data.clearedStatus,
    });

    // emit('exit');
  }

  const transactionStore = useTransactionStore();

  for (const [id, update] of updates.entries()) {
    transactionStore.update(id, update);
  }

  emit('exit');
}

const currentAccount = computed<
  Pick<Account, 'id' | 'name' | 'currency'> | undefined
>(() => {
  const accountStore = useAccountStore();

  return accountStore.accounts.find(
    (account) =>
      'accountId' in state.value && account.id === state.value.accountId,
  );
});

const emit = defineEmits(['exit']);

function cancel() {
  emit('exit');
}
</script>

<template>
  <div class="grid gap-6 grid-cols-2">
    <pre>{{ props.transaction }}</pre>
    <pre>{{ state }}</pre>
  </div>

  <UContainer>
    <UCard :ui="{ base: '' }">
      <UForm :state="state" :validate="validate" @submit="submit">
        <UFormGroup label="Payee/Item" name="payee">
          <UInput v-model="state.payee" />
        </UFormGroup>

        <div class="grid gap-6 grid-cols-2">
          <AccountPicker
            v-if="state.type === 'income' || state.type === 'expense'"
            v-model="state.accountId"
            :name="currentAccount?.name"
          />

          <DatePicker v-model="state.date" />
        </div>

        <div class="grid gap-6 grid-cols-2">
          <AmountInput
            v-if="state.type === 'income' || state.type === 'expense'"
            v-model="state.absoluteAmount"
            :currency="currentAccount?.currency"
          />

          <TypePicker v-model="state.type" />
        </div>

        <div
          v-if="state.type === 'income' || state.type === 'expense'"
          class="grid gap-6 grid-cols-2"
        >
          <CategoryPicker v-model="state.category" />

          <ProjectPicker v-model="state.category" />
        </div>

        <div
          v-if="state.type === 'income' || state.type === 'expense'"
          class="grid gap-6 grid-cols-2"
        >
          <ClearedStatusPicker v-model="state.clearedStatus" />
        </div>

        <UFormGroup label="Memo" name="memo">
          <UInput v-model="state.memo" />
        </UFormGroup>

        <div class="mt-2">
          <UButton class="mr-2" color="gray" @click="cancel">Cancel</UButton>
          <UButton type="submit">Save</UButton>
        </div>
      </UForm>
    </UCard>
  </UContainer>
</template>
