<script lang="ts" setup>
import { ref } from 'vue';
import { FormError, FormSubmitEvent } from '#ui/types';
import { uid } from 'uid';
import {
  FullTransaction,
  getTransactionNormalType,
  getTransferTransactionOrder,
  isTransferByCategory,
  NormalTransactionContextType,
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
import { getFullProjectName } from '~/store/project';
import {
  composeRawCategoryFromCategoryAndProject,
  getFullCategoryName,
} from '~/store/category';
import ExchangeRate from '~/components/transactions/input/ExchangeRate.vue';

const props = defineProps<{
  transaction: FullTransaction;
  reverseTransaction?: FullTransaction;
}>();

type TransferContext = {
  type: 'transfer';
  fromAccountId: string;
  toAccountId: string;
  toId: string;
  fromId: string;
  fromAbsoluteAmount: number;
  toAbsoluteAmount: number;
  fromClearedStatus: ClearedStatus;
  toClearedStatus: ClearedStatus;
};

type NormalTransactionContext = Pick<FullTransaction, 'accountId'> & {
  absoluteAmount: number;
  type: NormalTransactionContextType;
  clearedStatus: ClearedStatus;
  categoryName?: string;
};
type CommonTransactionContext = Pick<
  FullTransaction,
  'payee' | 'date' | 'memo'
> & { projectName?: string };

type TransactionContext = CommonTransactionContext &
  (NormalTransactionContext | TransferContext);
const accountStore = useAccountStore();

function transactionToContext(
  transaction: FullTransaction,
  reverseTransaction?: FullTransaction,
): TransactionContext {
  const common: CommonTransactionContext = {
    payee: transaction.payee,
    date: transaction.date,
    memo: transaction.memo,
    projectName: getFullProjectName(transaction),
  };

  if (isTransferByCategory(transaction)) {
    const transferContext: TransferContext = {
      type: 'transfer',
      fromAccountId: '',
      fromId: '',
      toAccountId: '',
      toId: '',
      fromAbsoluteAmount: 0,
      toAbsoluteAmount: 0,
      fromClearedStatus: '',
      toClearedStatus: '',
    };

    if (reverseTransaction) {
      const { from, to } = getTransferTransactionOrder(
        transaction,
        reverseTransaction,
      );

      transferContext.fromId = from.id;
      transferContext.fromAccountId = accountStore.getAccountIdByName(
        from.account,
      );
      transferContext.toId = to.id;
      transferContext.toAccountId = accountStore.getAccountIdByName(to.account);

      const fromFullTransaction: FullTransaction | undefined = [
        transaction,
        reverseTransaction,
      ].find((t) => t.id === from.id);

      if (!fromFullTransaction)
        throw new Error(`from full transaction with id ${from.id} not found`);

      const toFullTransaction: FullTransaction | undefined = [
        transaction,
        reverseTransaction,
      ].find((t) => t.id === to.id);

      if (!toFullTransaction)
        throw new Error(`to full transaction with id ${from.id} not found`);

      transferContext.fromAbsoluteAmount = Math.abs(fromFullTransaction.amount);
      transferContext.toAbsoluteAmount = Math.abs(toFullTransaction.amount);
      transferContext.fromClearedStatus = getClearedStatusFromString(
        fromFullTransaction.clearedStatus,
      );
      transferContext.toClearedStatus = getClearedStatusFromString(
        toFullTransaction.clearedStatus,
      );
    } else {
      const from = transaction;
      transferContext.fromId = from.id;
      transferContext.fromAccountId = accountStore.getAccountIdByName(
        from.account,
      );
      transferContext.fromAbsoluteAmount = Math.abs(from.amount);
      transferContext.fromClearedStatus = getClearedStatusFromString(
        from.clearedStatus,
      );

      transferContext.toId = uid();
      transferContext.toAccountId =
        accountStore.getFirstAccountIdToTransferFromName(transaction.account);
      transferContext.toAbsoluteAmount = 0;
    }

    return {
      ...common,
      ...transferContext,
    };
  } else {
    return {
      ...common,
      type: getTransactionNormalType(transaction),
      categoryName: getFullCategoryName(transaction),
      absoluteAmount: Math.abs(transaction.amount),
      accountId: transaction.accountId,
      clearedStatus: getClearedStatusFromString(transaction.clearedStatus),
    };
  }
}

const state = ref<TransactionContext>(
  transactionToContext(props.transaction, props.reverseTransaction),
);

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

function computeUpdateMapFromContext(
  context: TransactionContext,
): Map<string, Transaction> {
  const updates = new Map<string, Transaction>();

  if (context.type === 'income' || context.type === 'expense') {
    const account = currentNormalAccount.value;
    if (!account) {
      throw new Error(`Current account not found for id ${context.accountId}`);
    }

    updates.set(props.transaction.id, {
      amount: getAmountFromNormalContext(context),
      accountId: context.accountId,
      account: account.name,
      date: context.date,
      memo: context.memo,
      category: composeRawCategoryFromCategoryAndProject(
        context.categoryName,
        context.projectName,
      ),
      payee: context.payee,
      clearedStatus: context.clearedStatus,
    });
  } else if (context.type === 'transfer') {
    const accounts = transferAccount.value;
    if (!accounts.from)
      throw new Error(`Account from ${context.fromAccountId} not found`);
    if (!accounts.to)
      throw new Error(`Account to ${context.toAccountId} not found`);

    const commonUpdatePayload: CommonTransactionContext = {
      date: context.date,
      payee: context.payee,
      memo: context.memo,
    };

    updates.set(context.fromId, {
      amount: -context.fromAbsoluteAmount,
      ...commonUpdatePayload,
      account: accounts.from.name,
      accountId: accounts.from.id,
      clearedStatus: context.fromClearedStatus,
      category: composeRawCategoryFromCategoryAndProject(
        `[${accounts.to.name}]`,
        context.projectName,
      ),
    });

    updates.set(context.toId, {
      amount: context.toAbsoluteAmount,
      ...commonUpdatePayload,
      account: accounts.to.name,
      accountId: accounts.to.id,
      clearedStatus: context.toClearedStatus,
      category: composeRawCategoryFromCategoryAndProject(
        `[${accounts.from.name}]`,
        context.projectName,
      ),
    });
  }

  return updates;
}

function submit(event: FormSubmitEvent<TransactionContext>) {
  // eslint-disable-next-line no-console
  console.log(event.data);
  const updates = computeUpdateMapFromContext(event.data);

  const transactionStore = useTransactionStore();

  for (const [id, update] of updates.entries()) {
    transactionStore.update(id, update);
  }

  emit('exit');
}

const currentNormalAccount = computed<
  Pick<Account, 'id' | 'name' | 'currency'> | undefined
>(() => {
  const accountStore = useAccountStore();

  return accountStore.accounts.find(
    (account) =>
      'accountId' in state.value && account.id === state.value.accountId,
  );
});

const transferAccount = computed<{
  from: Pick<Account, 'id' | 'name' | 'currency'> | undefined;
  to: Pick<Account, 'id' | 'name' | 'currency'> | undefined;
}>(() => {
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

const emit = defineEmits(['exit']);

function cancel() {
  emit('exit');
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

          <TypePicker v-model="state.type" />
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
