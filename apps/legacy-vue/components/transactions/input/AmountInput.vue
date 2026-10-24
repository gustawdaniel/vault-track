<script lang="ts" setup>
const props = defineProps<{
  currency: string | undefined;
  modelValue: number;
}>();

const emit = defineEmits(['update:model-value']);

const value = computed<number>({
  get() {
    return props.modelValue;
  },
  set(value: number) {
    emit('update:model-value', value);
  },
});
</script>

<template>
  <UFormField
    :label="`Amount  ${props.currency ? '(' + props.currency + ')' : ''}`"
    name="amount"
  >
    <UInput
      v-model.number="value"
      class="text-right font-bold"
      icon="i-heroicons-calculator-20-solid"
    >
      <template v-if="props.currency" #trailing>
        <span class="text-gray-500 dark:text-gray-400 text-xs">
          {{ props.currency }}
        </span>
      </template>
    </UInput>
  </UFormField>
</template>

<style scoped></style>
