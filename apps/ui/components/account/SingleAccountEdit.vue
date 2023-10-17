<script lang="ts" setup>
import { ref } from 'vue';
import type { FormError, FormSubmitEvent } from '@nuxt/ui/dist/runtime/types';
import { Account, AccountType, useAccountStore } from '~/store/account';
import { currencies } from '~/store/currency';

const props = defineProps<{
  account: Account;
}>();

const state = ref({ ...props.account });

const validate = (state: any): FormError[] => {
  const errors = [];
  if (!state.name) errors.push({ path: 'name', message: 'Required' });
  if (!state.type) errors.push({ path: 'type', message: 'Required' });
  return errors;
};

const emit = defineEmits(['submit']);

function submit(event: FormSubmitEvent<any>) {
  // Do something with data
  // console.log(event.data);

  const accountStore = useAccountStore();
  accountStore.update(props.account.id, event.data);

  emit('submit');
}

const accountTypes: AccountType[] = ['Bank', 'Cash', 'CCard', 'Invst'];
</script>

<template>
  <UContainer>
    <UCard class="mt-8">
      <UForm :state="state" :validate="validate" @submit="submit">
        <UFormGroup label="Account Name" name="email">
          <UInput v-model="state.name" />
        </UFormGroup>

        <div class="grid gap-6 grid-cols-2">
          <UFormGroup label="Type" name="password">
            <USelectMenu v-model="state.type" :options="accountTypes" />
          </UFormGroup>

          <UFormGroup label="Currency" name="currency">
            <USelectMenu v-model="state.currency" :options="currencies" />
          </UFormGroup>
        </div>

        <UFormGroup label="Description" name="description">
          <UInput v-model="state.description" />
        </UFormGroup>

        <UFormGroup label="Account Closed/Hidden" name="hidden">
          <UToggle v-model="state.hidden" />
        </UFormGroup>

        <UFormGroup label="Position Order" name="order">
          <UInput v-model.number="state.order" />
        </UFormGroup>

        <UButton class="mt-3 mr-3" color="gray" @click="emit('submit')"
          >Cancel
        </UButton>
        <UButton class="mt-3" type="submit">Submit</UButton>
      </UForm>
    </UCard>
  </UContainer>
</template>

<style scoped></style>
