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
  <UFormField name="account">
    <template #label>
      <div class="flex items-center gap-2">
        <span>{{ props.label ?? 'Account' }}</span>
        <UButton v-if="modelValue" icon="i-heroicons-arrow-top-right-on-square" variant="link"
          :to="`/account/${modelValue}`" size="xs" class="p-0 h-auto" title="Go to Account" />
      </div>
    </template>
    <USelectMenu v-model="selected" :items="accounts" label-key="name" by="id" class="w-full">
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
