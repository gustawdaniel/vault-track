<script lang="ts" setup>
import { ucFirst } from '~/utils/ucFirst';

export type TransferContextType = 'expense' | 'income' | 'transfer';

const types: Array<{
  id: TransferContextType;
  name: string;
}> = [
  { id: 'expense', name: 'Expense' },
  { id: 'income', name: 'Income' },
  { id: 'transfer', name: 'Transfer' },
];

const props = defineProps<{
  modelValue: TransferContextType;
}>();
const emit = defineEmits(['update:model-value']);

function setType(value: TransferContextType): void {
  emit('update:model-value', value);
}
</script>

<template>
  <UFormField label="Type" name="type">
    <USelectMenu
      :model-value="props.modelValue"
      :items="types"
      option-attribute="name"
      value-attribute="id"
      @update:model-value="setType"
    >
      <template #label>
        {{ ucFirst(props.modelValue) }}
      </template>
    </USelectMenu>
  </UFormField>
</template>

<style scoped></style>
