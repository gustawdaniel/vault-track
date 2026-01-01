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
const emit = defineEmits(['update:modelValue']);

const selected = computed({
  get() {
    return types.find((t) => t.id === props.modelValue);
  },
  set(value) {
    if (value) {
      emit('update:modelValue', value.id);
    }
  },
});
</script>

<template>
  <UFormField label="Type" name="type">
    <USelectMenu v-model="selected" :items="types" label-key="name" class="w-full">
      <template #item-label="{ item }">
        {{ ucFirst(item.name) }}
      </template>
    </USelectMenu>
  </UFormField>
</template>

<style scoped></style>
