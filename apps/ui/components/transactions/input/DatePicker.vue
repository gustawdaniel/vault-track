<script lang="ts" setup>
import dayjs from 'dayjs';
import Calendar from '~/components/transactions/input/Calendar.vue';
import { toFullDate } from '~/utils/date';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits(['update:model-value']);

const date = computed<Date>({
  get() {
    return dayjs(props.modelValue).toDate();
  },
  set(date) {
    emit('update:model-value', toFullDate(date));
  },
});
const dateLabel = computed(() =>
  date.value.toLocaleDateString('pl', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }),
);
</script>

<template>
  <UFormField label="Date" name="date">
    <UPopover :popper="{ placement: 'bottom-start' }">
      <UInput :model-value="dateLabel" class="w-full" icon="i-heroicons-calendar-days-20-solid" />
      <template #content="{ close }">
        <Calendar v-model="date" @close="close" />
      </template>
    </UPopover>
  </UFormField>
</template>

<style scoped></style>
