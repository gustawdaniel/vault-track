<script lang="ts" setup>
import type { FormError, FormSubmitEvent } from '@nuxt/ui';
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
  const parts = getNameFromExtendableListItem(
    props.resource,
    item,
  ).split(':');
  
  const explicitName = parts.pop();
  const parentName = parts.join(':');

  return { parentName: parentName ?? '', explicitName: explicitName ?? '' };
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
  const { parentName, explicitName } = decomposeNameToParentAndExplicit(
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
  const explicitName = typeof state.explicitName === 'object' ? (state.explicitName as any).value : state.explicitName;
  const parentName = typeof state.parentName === 'object' ? (state.parentName as any).value : state.parentName;

  if (explicitName && explicitName.includes(':'))
    throw new Error(`Category name cant contain ":" character`);

  if (!parentName) {
    return explicitName;
  } else {
    if (parentName.includes(':')) {
       // Check if it's a project (resource === 'project'), projects might still want to enforce 2 layers if not updated?
       // The user only asked for categories.
       // However, the code path is shared.
       // But wait, composeName only takes state, it doesn't know resource type directly unless I check props.
       // But `state` doesn't strictly have resource type.
       // I can access `props.resource`.
       
       if (props.resource === 'project') {
          throw new Error(`Parent project name cant contain ":" character`);
       }
       // For categories, we allow ":" in parent (up to some depth, but validation here might just check for excessive depth if needed, or rely on UI filtering).
       // Let's just allow it for now.
    }
    return `${parentName}:${explicitName}`;
  }
}

const validate = (state: EditState): FormError[] => {
  const errors = [];
  const explicitName = typeof state.explicitName === 'object' ? (state.explicitName as any).value : state.explicitName;

  if (!explicitName) {
    errors.push({ path: 'explicit-name', message: 'Required' });
  } else if (explicitName.includes(':'))
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
        // Allow layer 0 (no colons) and layer 1 (1 colon)
        return categoryStore.categories.filter((c) => {
             // Exclude self
             if (c.id === state.value.id) return false;
             // Exclude current explicit name being same as category name (circular?)
             if (c.category === state.value.explicitName) return false;
             
             // Check depth: count colons.
             // Layer 0: 0 colons.
             // Layer 1: 1 colon.
             // Layer 2: 2 colons.
             // Users wants layer 0 and 1. So max 1 colon.
             const depth = (c.category.match(/:/g) || []).length;
             return depth <= 1;
        });
      }
    }
  },
);

const parentOptions = computed<{ label: string; value: string; color?: string }[]>(() => {
  if (props.resource === 'category') {
    return (possibleParentItems.value as PersistedCategory[]).map((c) => ({
      label: c.category,
      value: c.category,
      color: c.color,
      id: c.id,
    }));
  } else {
    return (possibleParentItems.value as PersistedProject[]).map((p) => ({
      label: p.project,
      value: p.project,
    }));
  }
});

const selectedParent = computed({
  get: () => {
    if (!state.value.parentName) return undefined;
    
    // If parentName is already an object (due to previous bad state), handle it
    const val = typeof state.value.parentName === 'object' ? (state.value.parentName as any).value : state.value.parentName;
    
    return parentOptions.value.find((o) => o.value === val);
  },
  set: (val: any) => {
    // Robustly handle if component returns object or string
    const stringVal = val?.value ?? (typeof val === 'string' ? val : '');
    state.value.parentName = stringVal;
  },
});

function cancel() {
  router.back();
}
</script>

<template>
  <AppContainer class="my-10">
    <UCard>
      <UForm :state="state" :validate="validate" @submit="submit">
        <UFormField label="Name" name="explicit-name">
          <UInput v-model="state.explicitName" autofocus />
        </UFormField>

        <UFormField label="Parent Category" name="parent-name">         
          <USelectMenu
            v-model="selectedParent"
            :items="parentOptions"
            label-attribute="label"
            class="w-full"
          >
            <template #item="{ item }" class="flex items-center -space-x-1 h-5">
              <span
                v-if="item.color"
                :style="{ background: `${item.color}` }"
                class="flex-shrink-0 w-2 h-2 mt-px rounded-full"
              />
              <span class="truncate">{{ item.label }}</span>
            </template>
          </USelectMenu>
        </UFormField>

        <UFormField v-if="resource === 'category'" label="Color" name="color">
          <input
            v-model="state.color"
            class="w-full h-8 border-0"
            type="color"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-6">
          <UButton class="mt-4 justify-center" color="neutral" @click="cancel">
            Cancel
          </UButton>
          <UButton class="mt-4 justify-center" color="neutral" type="submit">
            Save
          </UButton>
        </div>
      </UForm>
    </UCard>
  </AppContainer>
</template>

<style scoped></style>
