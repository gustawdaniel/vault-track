<script lang="ts" setup>
import { ref } from 'vue';
import type { FormError, FormSubmitEvent } from '@nuxt/ui';
import type {
  ComputedNormalAccount,
  ComputedTransferAccounts,
  TransactionContext,
  SplitContext,
} from './edit/types';
import type {
  FullTransaction,
  NormalTransactionContextType,
  Transaction,
} from '~/store/transaction.model';
import { useTransactionStore } from '~/store/transaction';
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
  transformNormalToSplit,
  transformSplitToNormal,
} from '~/components/transactions/edit/stateTypeTransitions';
import AppContainer from '~/components/shared/AppContainer.vue';
import { uid } from 'uid';
import { formatAmount } from '~/utils/formatAmount';
import { getGroupIdAsync } from '~/sync/client';
import { getBackendUrl } from '~/utils/backendUrl';

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

async function submit(event: FormSubmitEvent<TransactionContext>) {
  const updates = computeUpdateMapFromContext(
    props.transaction.id,
    event.data,
    currentNormalAccount.value,
    transferAccount.value,
  );

  const transactionStore = useTransactionStore();
  let returnedId = '';

  // Handle deletions for split transactions (remove siblings no longer in the update map)
  if (props.transaction.splitId) {
    const siblings = transactionStore.getSiblingsBySplitId(
      props.transaction.splitId,
    );
    const updatedIds = Array.from(updates.keys());

    for (const sibling of siblings) {
      if (!updatedIds.includes(sibling.id)) {
        // Delete individually (don't cascade since we're managing the full set)
        const index = transactionStore.getIndexById(sibling.id);
        if (index !== -1) {
          const accountStore = useAccountStore();
          accountStore.pathBalance(sibling.accountId, -sibling.amount);
          transactionStore.$state.transactions.splice(index, 1);
          // Sync deletion will happen via the individual sync call
          const { deleteTransaction: syncDelete } = await import('~/sync/manager');
          syncDelete(sibling.id);
        }
      }
    }
  }

  // Separate existing updates from new creates
  const existingUpdates = new Map<string, Transaction>();
  const newCreates: (Transaction & { id: string })[] = [];

  for (const [id, update] of updates.entries()) {
    const existingIndex = transactionStore.getIndexById(id);
    if (existingIndex !== -1) {
      existingUpdates.set(id, update);
    } else {
      newCreates.push({ ...update, id });
    }
    if (update.accountId === props.transaction.accountId) {
      returnedId = id;
    }
  }

  // Capture old transfer hashes before updates (update() recomputes them)
  const oldTransferHashes = new Map<string, string>();
  for (const [id] of existingUpdates.entries()) {
    const oldTx = transactionStore.getById(id);
    if (oldTx?.transferHash) {
      oldTransferHashes.set(id, oldTx.transferHash);
    }
  }

  // Apply updates to existing transactions (skip auto-cleanup, we handle it below)
  for (const [id, update] of existingUpdates.entries()) {
    transactionStore.update(id, update, { skipReverseCleanup: true });
  }

  // Clean up orphaned reverse transactions before creating new ones
  if (newCreates.length > 0) {
    for (const [id, oldHash] of oldTransferHashes.entries()) {
      const oldReverse = transactionStore.getReverseByIdAndHash(id, oldHash);
      if (oldReverse && !existingUpdates.has(oldReverse.id)) {
        transactionStore.delete(oldReverse.id);
      }
    }
  }

  // Batch create new transactions (atomic counter reservation)
  if (newCreates.length > 0) {
    await transactionStore.createBatch(newCreates, { updateAccountBalance: true });
  }

  emit('exit', returnedId ? { transactionId: returnedId } : undefined);
}

const emit = defineEmits(['exit']);

function cancel() {
  emit('exit');
}

function setType(newType: NormalTransactionContextType | 'transfer' | 'split') {
  if (state.value.type === newType) return;

  if (newType === 'split') {
    Object.assign(state.value, transformNormalToSplit(state.value));
  } else if (state.value.type === 'split') {
    // Converting from split to something else
    const normalState = transformSplitToNormal(state.value);
    if (newType === 'transfer') {
      Object.assign(
        state.value,
        transformNormalStateToTransfer(normalState as any),
      );
      // Need to verify if normalState is compatible. Yes, it returns NormalTransactionContext props.
      // But transformNormalStateToTransfer expects TransactionContext.
      const tempState = { ...state.value, ...normalState, type: 'expense' }; // Assume expense base
      Object.assign(
        state.value,
        transformNormalStateToTransfer(tempState as any),
      );
    } else {
      Object.assign(state.value, normalState);
    }
  } else if (
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

// function setType(newType: NormalTransactionContextType | 'transfer') {
//   if (
//     (state.value.type === 'expense' || state.value.type === 'income') &&
//     newType === 'transfer'
//   ) {
//     Object.assign(state.value, transformNormalStateToTransfer(state.value));
//   } else if (
//     state.value.type === 'transfer' &&
//     (newType === 'expense' || newType === 'income')
//   ) {
//     Object.assign(state.value, transformTransferStateToNormal(state.value));
//   }
//   state.value.type = newType;
// }

const transactionStore = useTransactionStore();

const autoCategorize = useDebounceFn((payee: string) => {
  if (!payee) return;

  const category = transactionStore.getCategoryByPayee(payee);
  if (category && 'categoryName' in state.value) {
    state.value.categoryName = category;
  }
}, 150);

watch(
  () => state.value.payee,
  (newPayee) => {
    if (newPayee) autoCategorize(newPayee);
  },
);

// Split Transaction Computed Properties
const splitTotal = computed(() => {
  if (state.value.type !== 'split') return 0;
  return state.value.splits.reduce((sum, s) => sum + s.amount, 0);
});

// We need a master amount for Split.
// In existing Cash Droid logic: "Transaction... dividing... into multiple...".
// Usually you enter Total Amount first, then split it.
// So we need a "Total Amount" field in Split mode.
// We can store it in `state.value`? `SplitContext` doesn't have `totalAmount`.
// I should add it to `SplitContext` or manage it locally if it's UI only.
// If I add it to `SplitContext`, I need to update `types.ts`.
// For now, let's derive it from the FIRST split amount or just add a local ref?
// No, local ref is bad when switching types.
// I'll add `totalAmount` to local state for Split mode?
// Or assume `splitTotal` MUST equal some target?
// User workflow: 1. Enter Total. 2. Click Split. 3. Divide.
// If I convert Normal(100) -> Split, I have 1 split of 100.
// Then I edit splits.
// I need to know the Target Total to calculate Remaining.
// So I should have a mutable `targetTotal` in `SplitContext`?
// Let's rely on `computed` sum for now, BUT if user wants to change total, they add/edit splits.
// Wait, usually implementation is: Total is fixed, splits sum up to it.
// If I assume `totalAmount` is input by user...
// Let's add `masterAmount` to `SplitContext`.

// I'll add `masterAmount` to `SplitContext` in `types.ts` later or now?
// I'll act as if I added it. I'll stick to local state if I can't update types easily, but updating types is better.
// Actually, `transformNormalToSplit` sets `splits` sum = normal amount.
// So initials match.
// I will add a `totalAmount` field to the UI that updates `splits`?
// No, typically you set Total, then you split it.
// Let's treat the SUM of splits as the source of truth if we don't have a separate field.
// BUT validation requires `Remaining == 0`. This implies there is a Difference between Total and Sum.
// So we MUST have a `masterAmount`.

// Let's use `state` extension or just add it to types?
// I will adding `masterAmount` to `SplitContext` is cleanest.
// I will duplicate `state` for now to avoid type errors in this view until I fix types.
// Actually, I can casts.
// `(state.value as any).masterAmount`

const splitMasterAmount = ref(0); // Sync this when entering split mode

watch(
  () => state.value.type,
  (newType, oldType) => {
    if (newType === 'split') {
      if (oldType === 'income' || oldType === 'expense') {
        splitMasterAmount.value = (state.value as any).absoluteAmount || 0;
      } else if (oldType === 'transfer') {
        splitMasterAmount.value = (state.value as any).fromAbsoluteAmount || 0;
      } else {
        // Already split or init?
        const s = state.value as SplitContext;
        splitMasterAmount.value = s.splits.reduce(
          (sum, sp) => sum + sp.amount,
          0,
        );
      }
    }
  },
  { immediate: true },
);

const splitRemaining = computed(() => {
  if (state.value.type !== 'split') return 0;
  return splitMasterAmount.value - splitTotal.value;
});

const isSplitValid = computed(() => {
  if (state.value.type !== 'split') return true;
  return (
    Math.abs(splitRemaining.value) < 0.01 &&
    state.value.splits.every((s) => s.amount > 0 && s.category)
  );
});

function addSplit() {
  if (state.value.type !== 'split') return;
  state.value.splits.push({
    id: uid(),
    amount: splitRemaining.value > 0 ? splitRemaining.value : 0,
    category: undefined,
    memo: '',
    payee: '',
  });
}

function removeSplit(index: number) {
  if (state.value.type !== 'split') return;
  state.value.splits.splice(index, 1);
}

function suggestCategory(splitIndex: number) {
  if (state.value.type !== 'split') return;
  const split = state.value.splits[splitIndex];
  // If split has no payee, maybe fall back to master payee?
  // User said master payee might just be splitId.
  // So let's rely on split payee.
  if (!split) return;

  const payee = split.payee || state.value.payee;

  if (!payee) return;

  const transactionStore = useTransactionStore();
  const suggestion = transactionStore.getSuggestedCategory(payee);
  if (suggestion && state.value.type === 'split' && state.value.splits[splitIndex]) {
    state.value.splits[splitIndex].category = suggestion;
  }
}

const fileInput = ref<HTMLInputElement | null>(null);
const isAnalyzing = ref(false);
const llmResult = ref<any>(null);

const onScanClick = () => {
  fileInput.value?.click();
};

const uploadReceipt = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  if (!file) return;

  isAnalyzing.value = true;
  llmResult.value = null;

  const formData = new FormData();
  formData.append('file', file);

  const syncGroupId = await getGroupIdAsync();

  try {
    // Use backend URL from env or localhost for dev
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/receipts/analyze`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Sync-Group-ID': syncGroupId || '',
      },
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to analyze receipt');
    }

    const result = await response.json();
    llmResult.value = result;

    // Apply result to state
    if (result.payee) state.value.payee = result.payee;
    if (result.date) state.value.date = result.date.split('T')[0];

    // Splits
    if (result.splits && Array.isArray(result.splits)) {
      // Force type transition to split
      state.value.type = 'split';

      // Initialize splits array for the new type structure
      // We cast to any/SplitContext because TS doesn't instantly narrow ref value after property set
      const splitState = state.value as unknown as SplitContext;
      splitState.splits = [];

      let total = 0;

      for (const item of result.splits) {
        const splitAmount = item.amount;
        total += splitAmount;

        splitState.splits.push({
          id: uid(),
          amount: splitAmount,
          memo: item.memo,
          payee: item.payee || state.value.payee,
          category: item.category // Use LLM suggestion
        });
      }

      // Update master amount
      // Prefer the explicit receipt_total from LLM if available, otherwise sum of splits
      const masterTotal = (typeof result.receipt_total === 'number' && result.receipt_total > 0)
        ? result.receipt_total
        : total;

      // Since we use splitMasterAmount ref in component
      splitMasterAmount.value = masterTotal;

      // Also update absoluteAmount
      (state.value as any).absoluteAmount = masterTotal;
    }

  } catch (e: any) {
    console.error(e);
    alert(e.message || 'Failed to analyze receipt');
  } finally {
    isAnalyzing.value = false;
    if (target) target.value = '';
  }
};
</script>

<template>
  <div class="grid gap-6 grid-cols-3">
    <Debug>{{ props.transaction }}</Debug>
    <Debug>{{ props.reverseTransaction }}</Debug>
    <Debug>{{ state }}</Debug>
    <Debug title="LLM Result">{{ llmResult }}</Debug>
  </div>

  <AppContainer>
    <UCard>
      <UForm :state="state" :validate="validate" @submit="submit">
        <div class="mb-4 flex gap-2">
          <UButton icon="i-heroicons-camera" :loading="isAnalyzing" variant="soft" @click="onScanClick">Scan Receipt
          </UButton>
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="uploadReceipt"/>
        </div>

        <UFormField :label="state.type === 'split' ? 'Group Name' : 'Payee/Item'" name="payee">
          <UInput v-model="state.payee" :placeholder="state.type === 'split' ? 'Optional group name' : ''" />
        </UFormField>
        <!-- Hide Master Payee in split mode, or keep as 'Group Name'? -->
        <!-- User said 'master payee can be just splitId'. implies we don't need to show it? -->
        <!-- But currently 'transactionToContext' puts something there. -->
        <!-- I will hide it or rename it? -->
        <!-- Let's hide it for now as per "master payee can be just splitId" -->

        <div class="grid gap-6 grid-cols-2">
          <!-- Account Picker (Shared) -->
          <AccountPicker
v-if="
            state.type === 'income' ||
            state.type === 'expense' ||
            state.type === 'split'
          " v-model="state.accountId" :name="currentNormalAccount?.name" />

          <AccountPicker
v-else-if="state.type === 'transfer'" v-model="state.fromAccountId"
            :name="transferAccount.from?.name" label="From Account" />

          <DatePicker v-model="state.date" />
        </div>

        <div class="grid gap-6 grid-cols-2">
          <!-- Amount Input -->
          <AmountInput
v-if="state.type === 'income' || state.type === 'expense'" v-model="state.absoluteAmount"
            :currency="currentNormalAccount?.currency" />

          <AmountInput
v-else-if="state.type === 'split'" v-model="splitMasterAmount"
            :currency="currentNormalAccount?.currency" label="Total Amount" />

          <AmountInput
v-else-if="state.type === 'transfer'" v-model="state.fromAbsoluteAmount"
            :currency="transferAccount.from?.currency" />

          <TypePicker :model-value="state.type" @update:model-value="setType" />
        </div>

        <!-- Normal Mode Inputs -->
        <div v-if="state.type === 'income' || state.type === 'expense'" class="grid gap-6 grid-cols-2">
          <CategoryPicker v-model="state.categoryName" />
          <ProjectPicker v-model="state.projectName" />
        </div>

        <!-- Transfer Mode Inputs -->
        <div v-if="state.type === 'transfer'" class="grid gap-6 grid-cols-2">
          <AccountPicker v-model="state.toAccountId" :name="transferAccount.to?.name" label="To Account" />
          <ProjectPicker v-model="state.projectName" />
        </div>

        <!-- Cleared Status for Normal -->
        <div v-if="state.type === 'income' || state.type === 'expense'" class="grid gap-6 grid-cols-2">
          <ClearedStatusPicker v-model="state.clearedStatus" />
        </div>

        <!-- Split Editor -->
        <div v-if="state.type === 'split'" class="my-4 border-t pt-4">
          <div class="flex justify-between items-center mb-2">
            <h3 class="font-bold">Splits</h3>
            <div class="text-sm">
              <span
:class="{
                'text-red-500': Math.abs(splitRemaining) > 0.01,
                'text-green-500': Math.abs(splitRemaining) <= 0.01,
              }">
                Remaining: {{ formatAmount(splitRemaining, currentNormalAccount?.currency) }}
                {{ currentNormalAccount?.currency }}
              </span>
            </div>
          </div>

          <div
v-for="(split, index) in state.splits" :key="split.id"
            class="grid grid-cols-1 md:grid-cols-12 gap-2 items-end mb-4 border-b border-gray-200 pb-2">
            <UFormField label="Payee" class="md:col-span-3">
              <UInput v-model="split.payee" placeholder="Payee" @blur="suggestCategory(index)" />
            </UFormField>

            <CategoryPicker v-model="split.category" placeholder="Category" class="md:col-span-3" />

            <div class="md:col-span-2">
              <AmountInput v-model="split.amount" :currency="currentNormalAccount?.currency" />
            </div>

            <UFormField label="Memo" class="md:col-span-3">
              <UInput v-model="split.memo" placeholder="Memo" />
            </UFormField>

            <div class="md:col-span-1 flex justify-end">
              <UButton
icon="i-heroicons-trash" color="error" variant="ghost" class="mb-0.5"
                @click="removeSplit(index)" />
            </div>
          </div>

          <UButton icon="i-heroicons-plus" variant="soft" @click="addSplit">Add Split</UButton>
        </div>

        <!-- Transfer Exchange Rate & Status -->
        <div
v-if="
          state.type === 'transfer' &&
          transferAccount.from?.currency &&
          transferAccount.to?.currency &&
          transferAccount.from?.currency !== transferAccount.to?.currency
        " class="grid gap-6 grid-cols-2">
          <AmountInput v-model="state.toAbsoluteAmount" :currency="transferAccount.to?.currency" />

          <ExchangeRate
:from-amount="state.fromAbsoluteAmount" :from-currency="transferAccount.from?.currency"
            :to-amount="state.toAbsoluteAmount" :to-currency="transferAccount.to?.currency" />
        </div>

        <div v-if="state.type === 'transfer'" class="grid gap-6 grid-cols-2">
          <ClearedStatusPicker v-model="state.fromClearedStatus" label="Status (From)" />

          <ClearedStatusPicker v-model="state.toClearedStatus" label="Status (To)" />
        </div>

        <UFormField v-if="state.type !== 'split'" label="Memo" name="memo">
          <UInput v-model="state.memo" />
        </UFormField>

        <!-- Global memo for split? Or just hide it? Requirement says opcjonalny memo per split. Global memo might be useful for grouping ID derivation if we used it, but we use splitId. -->
        <UFormField v-if="state.type === 'split'" label="Group Memo" name="memo">
          <UInput v-model="state.memo" placeholder="Optional group description" />
        </UFormField>

        <div class="mt-2">
          <UButton class="mr-2" color="neutral" @click="cancel">Cancel</UButton>
          <!-- TODO: save & new button -->
          <UButton type="submit" :disabled="!isSplitValid">Save</UButton>
        </div>
      </UForm>
    </UCard>
  </AppContainer>
</template>
