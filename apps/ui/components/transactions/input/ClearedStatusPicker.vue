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

const selected = computed<ClearedStatus>({
  get() {
    return props.modelValue ?? '';
  },
  set(value: ClearedStatus) {
    emit('update:model-value', value);
  },
});
</script>

<template>
  <UFormField :label="props.label ?? 'Status'" name="clearedStatus">
    <USelectMenu
      v-model="selected"
      :items="options"
      option-attribute="name"
      placeholder="Select status"
      value-attribute="id"
    >
      <template #label>
        {{ getClearedStatusName(selected ?? '') }}
      </template>
    </USelectMenu>
  </UFormField>
</template>
