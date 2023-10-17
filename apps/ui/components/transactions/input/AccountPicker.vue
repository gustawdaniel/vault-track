<script lang="ts" setup>
import { Account, useAccountStore } from '~/store/account';

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
  name: string | undefined;
}>();

const emit = defineEmits(['update:model-value']);

function setAccount(value: string): void {
  emit('update:model-value', value);
}
</script>

<template>
  <UFormGroup label="Account" name="account">
    <USelectMenu
      :model-value="props.modelValue"
      :options="accounts"
      option-attribute="name"
      searchable
      value-attribute="id"
      @update:model-value="setAccount"
    >
      <template #label>
        {{ props.name ? props.name : 'Unknown' }}
      </template>
    </USelectMenu>
  </UFormGroup>
</template>

<style scoped></style>
