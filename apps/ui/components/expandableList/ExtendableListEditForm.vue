<script lang="ts" setup>
import type { FormError, FormSubmitEvent } from '#ui/types';
import { type PersistedCategory, useCategoryStore } from '~/store/category';
import { type PersistedProject, useProjectStore } from '~/store/project';
import { getNameFromExtendableListItem } from '~/utils/getNameFromExtendableListItem';
import AppContainer from '~/components/shared/AppContainer.vue';

const props = defineProps<
  | {
      resource: 'category';
      initValue: PersistedCategory;
    }
  | {
      resource: 'project';
      initValue: PersistedProject;
    }
>();

function decomposeNameToParentAndExplicit(
  item:
    | {
        category: string;
      }
    | {
        project: string;
      },
): {
  parentName: string;
  explicitName: string;
} {
  const [explicitName, parentName] = getNameFromExtendableListItem(
    props.resource,
    item,
  )
    .split(':')
    .reverse();
  return { parentName, explicitName };
}

interface EditState {
  id: string;
  parentName: string;
  explicitName: string;
  color?: string;
}

const state = ref<EditState>({
  id: props.initValue.id,
  ...decomposeNameToParentAndExplicit(props.initValue),
  ...(props.resource === 'category'
    ? { color: props.initValue.color ?? 'transparent' }
    : {}),
});

const isRoot = computed<boolean>(() => {
  const [explicitName, parentName] = getNameFromExtendableListItem(
    props.resource,
    props.initValue,
  );

  return !parentName && Boolean(explicitName);
});

const hasChildren = computed<boolean>(() => {
  switch (props.resource) {
    case 'project': {
      const projectStore = useProjectStore();
      return 'project' in props.initValue
        ? Boolean(projectStore.getSubProjects(props.initValue.project).length)
        : false;
    }
    case 'category': {
      const categoryStore = useCategoryStore();
      return 'category' in props.initValue
        ? Boolean(
            categoryStore.getSubCategories(props.initValue.category).length,
          )
        : false;
    }
    default:
      return false;
  }
});

function composeName(
  state: Pick<EditState, 'parentName' | 'explicitName'>,
): string {
  if (state.explicitName.includes(':'))
    throw new Error(`Category name cant contain ":" character`);

  if (!state.parentName) {
    return state.explicitName;
  } else {
    if (state.parentName.includes(':'))
      throw new Error(`Parent category name cant contain ":" character`);
    return `${state.parentName}:${state.explicitName}`;
  }
}

const validate = (state: EditState): FormError[] => {
  const errors = [];

  if (!state.explicitName) {
    errors.push({ path: 'explicit-name', message: 'Required' });
  } else if (state.explicitName.includes(':'))
    errors.push({
      path: 'explicit-name',
      message: `Category name cant contain ":" character`,
    });

  return errors;
};

const router = useRouter();

function submit(event: FormSubmitEvent<EditState>) {
  if (props.resource === 'category') {
    const categoryStore = useCategoryStore();
    categoryStore.update(state.value.id, {
      color: event.data.color ?? 'transparent',
      category: composeName(event.data),
    });

    router.push('/categories');
  } else {
    const projectStore = useProjectStore();
    projectStore.update(state.value.id, {
      project: composeName(event.data),
    });

    router.push('/projects');
  }
}

const possibleParentItems = computed<PersistedProject[] | PersistedCategory[]>(
  () => {
    switch (props.resource) {
      case 'project': {
        const projectStore = useProjectStore();
        return projectStore.rootProjects.filter(
          (p) =>
            p.project !== state.value.explicitName && p.id !== state.value.id,
        );
      }
      case 'category': {
        const categoryStore = useCategoryStore();
        return categoryStore.rootCategories.filter(
          (p) =>
            p.category !== state.value.explicitName && p.id !== state.value.id,
        );
      }
    }
  },
);

function cancel() {
  router.back();
}
</script>

<template>
  <AppContainer class="my-10">
    <UCard class="h-screen">
      <UForm :state="state" :validate="validate" @submit="submit">
        <UFormField label="Name" name="explicit-name">
          <UInput v-model="state.explicitName" />
        </UFormField>

        <UFormField label="Parent Category" name="parent-name">
          <USelectMenu
            v-model="state.parentName"
            :disabled="isRoot && hasChildren"
            :option-attribute="resource"
            :options="possibleParentItems"
            :value-attribute="resource"
          />
        </UFormField>

        <UFormField v-if="resource === 'category'" label="Color" name="color">
          <input
            v-model="state.color"
            class="w-full h-8 border-0"
            type="color"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-6">
          <UButton class="mt-4 justify-center" color="gray" @click="cancel">
            Cancel
          </UButton>
          <UButton class="mt-4 justify-center" color="gray" type="submit">
            Save
          </UButton>
        </div>
      </UForm>
    </UCard>
  </AppContainer>
</template>

<style scoped></style>
