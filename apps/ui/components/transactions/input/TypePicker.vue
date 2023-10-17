<script lang="ts" setup>
export type TransferContextType = 'expense' | 'income' | 'transfer';

const types: Array<{
  id: TransferContextType;
  name: string;
}> = [
  { id: 'expense', name: 'Expense' },
  { id: 'income', name: 'Income' },
  { id: 'transfer', name: 'Transfer' },
];

function ucFirst(word: string): string {
  if (!word) return '';
  return word.substring(0, 1).toUpperCase() + word.substring(1);
}

const props = defineProps<{
  modelValue: TransferContextType;
}>();
const emit = defineEmits(['update:model-value']);

function setType(value: TransferContextType): void {
  emit('update:model-value', value);
}
</script>

<template>
  <UFormGroup label="Type" name="type">
    <USelectMenu
      :model-value="props.modelValue"
      :options="types"
      option-attribute="name"
      value-attribute="id"
      @update:model-value="setType"
    >
      <template #label>
        {{ ucFirst(props.modelValue) }}
      </template>
    </USelectMenu>
  </UFormGroup>
</template>

<style scoped></style>
