<script lang="ts" setup>
import {
  type ClearedStatus,
  clearedStatusMap,
  getClearedStatusName,
} from '~/store/clearedStatus';

const props = defineProps<{ modelValue: ClearedStatus; label?: string }>();
const emit = defineEmits(['update:model-value']);

const options = [...clearedStatusMap.entries()].map(([id, name]) => ({
  id,
  name,
}));

const selected = computed({
  get() {
    return options.find((o) => o.id === (props.modelValue ?? ''));
  },
  set(value) {
    if (value) {
      emit('update:model-value', value.id);
    }
  },
});
</script>

<template>
  <UFormField :label="props.label ?? 'Status'" name="clearedStatus">
    <USelectMenu v-model="selected" :items="options" label-key="name" placeholder="Select status" by="id" />
  </UFormField>
</template>
