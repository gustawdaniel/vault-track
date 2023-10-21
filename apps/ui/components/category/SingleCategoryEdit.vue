<script lang="ts" setup>
import { FormError, FormSubmitEvent } from '#ui/types';
import {
  Category,
  PersistedCategory,
  useCategoryStore,
} from '~/store/category';

const props = defineProps<{ category: PersistedCategory }>();

function decomposeCategoryNameToParentAndExplicit(
  category: Pick<PersistedCategory, 'category'>,
): { parentCategoryName: string; explicitCategoryName: string } {
  const [parentCategoryName, explicitCategoryName] =
    category.category.split(':');
  return { parentCategoryName, explicitCategoryName };
}

interface CategoryEditState {
  id: string;
  parentCategoryName: string;
  explicitCategoryName: string;
  color: string;
}

const state = ref<CategoryEditState>({
  id: props.category.id,
  ...decomposeCategoryNameToParentAndExplicit(props.category),
  color: props.category.color ?? 'transparent',
});

function composeCategoryName(
  state: Pick<CategoryEditState, 'parentCategoryName' | 'explicitCategoryName'>,
): string {
  if (state.explicitCategoryName.includes(':'))
    throw new Error(`Category name cant contain ":" character`);

  if (!state.parentCategoryName) {
    return state.explicitCategoryName;
  } else {
    if (state.parentCategoryName.includes(':'))
      throw new Error(`Parent category name cant contain ":" character`);
    return `${state.parentCategoryName}:${state.explicitCategoryName}`;
  }
}

const validate = (state: CategoryEditState): FormError[] => {
  const errors = [];

  if (!state.explicitCategoryName) {
    errors.push({ path: 'explicit-name', message: 'Required' });
  } else if (state.explicitCategoryName.includes(':'))
    errors.push({
      path: 'explicit-name',
      message: `Category name cant contain ":" character`,
    });

  return errors;
};

const router = useRouter();

function submit(event: FormSubmitEvent<CategoryEditState>) {
  // Do something with data
  console.log(event.data, 2);

  const categoryStore = useCategoryStore();
  categoryStore.update(state.value.id, {
    color: event.data.color,
    category: composeCategoryName(event.data),
  });

  router.push('/categories');
}

const possibleParentCategories = computed<Category[]>(() => {
  const categoryStore = useCategoryStore();
  return categoryStore.rootCategories;
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
          <UInput v-model="state.explicitCategoryName" />
        </UFormGroup>

        <UFormGroup label="Parent Category" name="parent-name">
          <USelectMenu
            v-model="state.parentCategoryName"
            :options="possibleParentCategories"
            option-attribute="category"
            value-attribute="category"
          />
        </UFormGroup>

        <UFormGroup label="Color" name="color">
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
