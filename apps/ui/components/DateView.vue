<script lang="ts" setup>
import { useDateFormat } from '@vueuse/core';

const props = defineProps<{ date: string }>();

const formatted = useDateFormat(props.date, 'DD MMM YYYY');
</script>

<template>
  <p class="text-gray-600 text-sm font-bold">{{ formatted }}</p>
</template>
