<script lang="ts" setup>
import { type Account, useAccountStore } from '~/store/account';

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

const props = defineProps<{
  modelValue: string;
  label?: string;
}>();

const emit = defineEmits(['update:modelValue']);

const selected = computed({
  get() {
    return accounts.value.find((a) => a.id === props.modelValue);
  },
  set(value) {
    if (value) {
      emit('update:modelValue', value.id);
    }
  },
});
</script>

<template>
  <UFormField :label="props.label ?? 'Account'" name="account">
    <USelectMenu v-model="selected" :items="accounts" option-attribute="name" 
    searchable
    class="w-full">
      <template #item-label="{ item }">
        {{ item.name }}

        <span class="text-muted">
          {{ item.currency }}
        </span>
      </template>
    </USelectMenu>
  </UFormField>
</template>

<style scoped></style>
