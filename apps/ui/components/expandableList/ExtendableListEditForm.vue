<script lang="ts" setup>
import { FormError, FormSubmitEvent } from '#ui/types';
import {
  Category,
  PersistedCategory,
  useCategoryStore,
} from '~/store/category';
import { PersistedProject, useProjectStore } from '~/store/project';
import { getNameFromExtendableListItem } from '~/utils/getNameFromExtendableListItem';

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
  // Do something with data
  console.log(event.data, 2);

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

const possibleParentItems = computed<Category[]>(() => {
  switch (props.resource) {
    case 'project': {
      const projectStore = useProjectStore();
      return projectStore.rootProjects;
    }
    case 'category': {
      const categoryStore = useCategoryStore();
      return categoryStore.rootCategories;
    }
  }
});

function cancel() {
  router.back();
}
</script>

<template>
  <UContainer class="my-10">
    <UCard class="h-screen">
      <UForm :state="state" :validate="validate" @submit="submit">
        <UFormGroup label="Name" name="explicit-name">
          <UInput v-model="state.explicitName" />
        </UFormGroup>

        <UFormGroup label="Parent Category" name="parent-name">
          <USelectMenu
            v-model="state.parentName"
            :option-attribute="resource"
            :options="possibleParentItems"
            :value-attribute="resource"
          />
        </UFormGroup>

        <UFormGroup v-if="resource === 'category'" label="Color" name="color">
          <input
            v-model="state.color"
            class="w-full h-8 border-0"
            type="color"
          />
        </UFormGroup>

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
  </UContainer>
</template>

<style scoped></style>
