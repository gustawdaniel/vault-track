<script lang="ts" setup>
import {
  getFullProjectName,
  type Project,
  useProjectStore,
} from '~/store/project';

const projectStore = useProjectStore();

const NO_PROJECT = 'No Project';

const props = defineProps<{
  modelValue: string | undefined;
}>();
const emit = defineEmits(['update:modelValue']);

const options = computed<Array<Project>>(() => {
  return [...projectStore.projects, { project: NO_PROJECT }];
});

const selected = computed({
  get() {
    if (!props.modelValue) return undefined;
    if (props.modelValue === NO_PROJECT) return options.value.find(o => o.project === NO_PROJECT);
    return options.value.find((c) => c.project === props.modelValue);
  },
  set(value: string | Project | undefined) {
    if (typeof value === 'object' && value !== null) {
      if (value.project === NO_PROJECT) {
        emit('update:modelValue', '');
      } else {
        emit('update:modelValue', value.project);
      }
    } else if (typeof value === 'string') {
      // Handle "creatable" input which renders as string initially or via create-option
      emit('update:modelValue', value);
    }
  },
});

function onCreate(option: string | Project) {
  const projectName = typeof option === 'string' ? option : option.project;
  if (projectName) {
    projectStore.create({ project: projectName });
    emit('update:modelValue', projectName);
  }
}
</script>

<template>
  <UFormField label="Project" name="project">
    <USelectMenu v-model="selected" :items="options" by="project" create-item label-key="project" class="w-full"
      @create="onCreate">
      <template #item-label="{ item }">
        <span class="truncate">{{ item.project }}</span>
      </template>

      <template #item="{ item }">
        <span class="truncate">{{ item.project }}</span>
      </template>
    </USelectMenu>
  </UFormField>
</template>

<style scoped></style>
