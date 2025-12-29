<script lang="ts" setup>
import { ref } from 'vue';
import type { FormError, FormSubmitEvent } from '@nuxt/ui';
import {
  type Account,
  type AccountType,
  useAccountStore,
} from '~/store/account';
import { currencies } from '~/store/currency';
import AppContainer from '~/components/shared/AppContainer.vue';

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

  emit('submit', props.account.id);
}

const accountTypes: AccountType[] = ['Bank', 'Cash', 'CCard', 'Invst'];
</script>

<template>
  <AppContainer>
    <UCard class="mt-8">
      <UForm :state="state" :validate="validate" @submit="submit">
        <UFormField label="Account Name" name="email">
          <UInput v-model="state.name" />
        </UFormField>

        <div class="grid gap-6 grid-cols-2">
          <UFormField label="Type" name="password">
            <USelectMenu v-model="state.type" :items="accountTypes" />
          </UFormField>

          <UFormField label="Currency" name="currency">
            <USelectMenu v-model="state.currency" :items="currencies" />
          </UFormField>
        </div>

        <UFormField label="Description" name="description">
          <UInput v-model="state.description" />
        </UFormField>

        <UFormField label="Account Closed/Hidden" name="hidden">
          <USwitch v-model="state.hidden" />
        </UFormField>

        <UFormField label="Position Order" name="order">
          <UInput v-model.number="state.order" />
        </UFormField>

        <UButton class="mt-3 mr-3" color="neutral" @click="emit('submit')"
          >Cancel
        </UButton>
        <UButton class="mt-3" type="submit">Submit</UButton>
      </UForm>
    </UCard>
  </AppContainer>
</template>

<style scoped></style>
