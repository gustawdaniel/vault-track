<script lang="ts" setup>
const props = defineProps<{
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
}>();

const rate = computed<{ strict: number; reverse: number }>(() => {
  return {
    strict: props.toAmount / props.fromAmount,
    reverse: props.fromAmount / props.toAmount,
  };
});

function format4Digits(value: number): string {
  return value.toFixed(4);
}
</script>

<template>
  <UFormField class="text-xs" label="Exchange Rate">
    <p class="text-xs ml-6 font-semibold">
      1 {{ props.fromCurrency }} = {{ format4Digits(rate.strict) }}
      {{ props.toCurrency }}
    </p>
    <p class="text-xs ml-6 font-semibold">
      1 {{ props.toCurrency }} = {{ format4Digits(rate.reverse) }}
      {{ props.fromCurrency }}
    </p>
  </UFormField>
</template>

<style scoped></style>
