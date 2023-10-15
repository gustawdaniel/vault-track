<script lang="ts" setup>
import { DatePicker as VCalendarDatePicker } from 'v-calendar';
import 'v-calendar/dist/style.css';

const props = defineProps({
  modelValue: {
    type: Date,
    default: null,
  },
});

const emit = defineEmits(['update:model-value', 'close']);

const colorMode = useColorMode();

const isDark = computed(() => colorMode.value === 'dark');

const date = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:model-value', value);
    emit('close');
  },
});

const attrs = [
  {
    key: 'today',
    highlight: {
      color: 'blue',
      fillMode: 'outline',
      class: '!bg-gray-100 dark:!bg-gray-800',
    },
    dates: new Date(),
  },
];
</script>

<template>
  <VCalendarDatePicker
    v-model="date"
    :attributes="attrs"
    :first-day-of-week="2"
    :is-dark="isDark"
    borderless
    title-position="left"
    transparent
    trim-weeks
  />
</template>
