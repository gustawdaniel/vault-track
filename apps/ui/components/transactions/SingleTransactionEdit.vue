<script lang="ts" setup>
import { ref } from 'vue';
import { FormError, FormSubmitEvent } from '#ui/types';
import {
  ComputedNormalAccount,
  ComputedTransferAccounts,
  TransactionContext,
} from './edit/types';
import {
  FullTransaction,
  NormalTransactionContextType,
  useTransactionStore,
} from '~/store/transaction';
import { useAccountStore } from '~/store/account';
import CategoryPicker from '~/components/category/CategoryPicker.vue';
import AmountInput from '~/components/transactions/input/AmountInput.vue';
import AccountPicker from '~/components/transactions/input/AccountPicker.vue';
import DatePicker from '~/components/transactions/input/DatePicker.vue';
import TypePicker from '~/components/transactions/input/TypePicker.vue';
import ClearedStatusPicker from '~/components/transactions/input/ClearedStatusPicker.vue';
import ExchangeRate from '~/components/transactions/input/ExchangeRate.vue';
import { transactionToContext } from '~/components/transactions/edit/transactionToContext';
import { computeUpdateMapFromContext } from '~/components/transactions/edit/computeUpdateMapFromContext';
import {
  transformNormalStateToTransfer,
  transformTransferStateToNormal,
} from '~/components/transactions/edit/stateTypeTransitions';

const props = defineProps<{
  transaction: FullTransaction;
  reverseTransaction?: FullTransaction;
}>();

const state = ref<TransactionContext>(
  transactionToContext(props.transaction, props.reverseTransaction),
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const validate = (state: any): FormError[] => {
  // TODO: add validation
  return [];
};

const currentNormalAccount = computed<ComputedNormalAccount>(() => {
  const accountStore = useAccountStore();

  return accountStore.accounts.find(
    (account) =>
      'accountId' in state.value && account.id === state.value.accountId,
  );
});

const transferAccount = computed<ComputedTransferAccounts>(() => {
  const accountStore = useAccountStore();

  if (state.value.type === 'transfer') {
    return {
      from: accountStore.getById(state.value.fromAccountId),
      to: accountStore.getById(state.value.toAccountId),
    };
  } else {
    return { from: undefined, to: undefined };
  }
});

function submit(event: FormSubmitEvent<TransactionContext>) {
  // eslint-disable-next-line no-console
  console.log(event.data);
  const updates = computeUpdateMapFromContext(
    props.transaction.id,
    event.data,
    currentNormalAccount.value,
    transferAccount.value,
  );

  console.log('updates', updates);

  const transactionStore = useTransactionStore();

  for (const [id, update] of updates.entries()) {
    transactionStore.update(id, update);
  }

  // orphaned part of transfer remove if changed to normal
  // if (
  //   (state.value.type === 'income' || state.value.type === 'expense') &&
  //   props.transaction.transferHash &&
  //   props.reverseTransaction
  // ) {
  //   transactionStore.delete(props.reverseTransaction.id);
  // }

  emit('exit');
}

const emit = defineEmits(['exit']);

function cancel() {
  emit('exit');
}

function setType(newType: NormalTransactionContextType | 'transfer') {
  if (
    (state.value.type === 'expense' || state.value.type === 'income') &&
    newType === 'transfer'
  ) {
    Object.assign(state.value, transformNormalStateToTransfer(state.value));
  } else if (
    state.value.type === 'transfer' &&
    (newType === 'expense' || newType === 'income')
  ) {
    Object.assign(state.value, transformTransferStateToNormal(state.value));
  }
  state.value.type = newType;
}
</script>

<template>
  <div class="grid gap-6 grid-cols-3">
    <pre>{{ props.transaction }}</pre>
    <pre>{{ props.reverseTransaction }}</pre>
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
            :name="currentNormalAccount?.name"
          />

          <AccountPicker
            v-else-if="state.type === 'transfer'"
            v-model="state.fromAccountId"
            :name="transferAccount.from?.name"
            label="From Account"
          />

          <DatePicker v-model="state.date" />
        </div>

        <div class="grid gap-6 grid-cols-2">
          <AmountInput
            v-if="state.type === 'income' || state.type === 'expense'"
            v-model="state.absoluteAmount"
            :currency="currentNormalAccount?.currency"
          />

          <AmountInput
            v-else-if="state.type === 'transfer'"
            v-model="state.fromAbsoluteAmount"
            :currency="transferAccount.from?.currency"
          />

          <TypePicker :model-value="state.type" @update:model-value="setType" />
        </div>

        <div class="grid gap-6 grid-cols-2">
          <CategoryPicker
            v-if="state.type === 'income' || state.type === 'expense'"
            v-model="state.categoryName"
          />
          <AccountPicker
            v-else-if="state.type === 'transfer'"
            v-model="state.toAccountId"
            :name="transferAccount.to?.name"
            label="To Account"
          />

          <ProjectPicker v-model="state.projectName" />
        </div>

        <div
          v-if="state.type === 'income' || state.type === 'expense'"
          class="grid gap-6 grid-cols-2"
        >
          <ClearedStatusPicker v-model="state.clearedStatus" />

          <!-- TODO: add here split transaction-->
        </div>

        <div
          v-else-if="
            state.type === 'transfer' &&
            transferAccount.from?.currency &&
            transferAccount.to?.currency &&
            transferAccount.from?.currency !== transferAccount.to?.currency
          "
          class="grid gap-6 grid-cols-2"
        >
          <AmountInput
            v-model="state.toAbsoluteAmount"
            :currency="transferAccount.to?.currency"
          />

          <ExchangeRate
            :from-amount="state.fromAbsoluteAmount"
            :from-currency="transferAccount.from?.currency"
            :to-amount="state.toAbsoluteAmount"
            :to-currency="transferAccount.to?.currency"
          />
        </div>

        <div v-if="state.type === 'transfer'" class="grid gap-6 grid-cols-2">
          <ClearedStatusPicker
            v-model="state.fromClearedStatus"
            label="Status (From)"
          />

          <ClearedStatusPicker
            v-model="state.toClearedStatus"
            label="Status (To)"
          />
        </div>

        <UFormGroup label="Memo" name="memo">
          <UInput v-model="state.memo" />
        </UFormGroup>

        <div class="mt-2">
          <UButton class="mr-2" color="gray" @click="cancel">Cancel</UButton>
          <!-- TODO: save & new button -->
          <UButton type="submit">Save</UButton>
        </div>
      </UForm>
    </UCard>
  </UContainer>
</template>
