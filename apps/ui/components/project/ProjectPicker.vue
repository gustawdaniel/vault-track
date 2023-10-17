<script lang="ts" setup>
import { getFullProjectName, Project, useProjectStore } from '~/store/project';
import {
  composeRawCategoryFromCategoryAndProject,
  decomposeRawCategoryToCategoryAndProject,
} from '~/store/category';

const projectStore = useProjectStore();

const NO_PROJECT = 'No Project';

const props = defineProps<{
  modelValue: string | undefined;
}>();
const emit = defineEmits(['update:model-value']);

function setProject(
  value:
    | string
    | {
        project: string;
      },
): void {
  const [categoryName] = decomposeRawCategoryToCategoryAndProject(
    props.modelValue,
  );

  if (typeof value === 'string') {
    if (value === NO_PROJECT) value = '';
    // update
    emit(
      'update:model-value',
      composeRawCategoryFromCategoryAndProject(categoryName, value),
    );
  } else {
    // create new
    const newProjectName = value.project;
    projectStore.create({ project: newProjectName });
    emit(
      'update:model-value',
      composeRawCategoryFromCategoryAndProject(categoryName, newProjectName),
    );
  }
}

const options = computed<Array<Project>>(() => {
  return [...projectStore.projects, { project: NO_PROJECT }];
});
</script>

<template>
  <UFormGroup label="Project" name="project">
    <USelectMenu
      :model-value="getFullProjectName({ category: props.modelValue })"
      :options="options"
      by="project"
      creatable
      option-attribute="project"
      searchable
      value-attribute="project"
      @update:model-value="setProject"
    >
      <template #label>
        <template v-if="props.modelValue">
          <span class="h-5">{{
            getFullProjectName({ category: props.modelValue })
          }}</span>
        </template>
        <template v-else>
          <span class="text-gray-500 dark:text-gray-400 truncate">
            Select project
          </span>
        </template>
      </template>
      <template #option="{ option }">
        <span class="truncate">{{ option.project }}</span>
      </template>
      <template #option-create="{ option }">
        <span class="flex-shrink-0">New project:</span>
        <span class="block truncate">{{ option.project }}</span>
      </template>
    </USelectMenu>
  </UFormGroup>
</template>

<style scoped></style>
