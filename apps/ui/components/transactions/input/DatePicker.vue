<script lang="ts" setup>
import dayjs from 'dayjs';
import Calendar from '~/components/transactions/input/Calendar.vue';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits(['update:model-value']);

const date = computed<Date>({
  get() {
    return dayjs(props.modelValue).toDate();
  },
  set(date) {
    emit('update:model-value', dayjs(date).format('YYYY-MM-DDT00:00:00'));
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
  <UFormGroup label="Date" name="date">
    <UPopover :popper="{ placement: 'bottom-start' }">
      <UInput
        :model-value="dateLabel"
        class="w-full"
        icon="i-heroicons-calendar-days-20-solid"
      />
      <template #panel="{ close }">
        <Calendar v-model="date" @close="close" />
      </template>
    </UPopover>
  </UFormGroup>
</template>

<style scoped></style>
