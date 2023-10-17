import { RemovableRef, useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { getRandomColor } from '~/utils/getRandomColor';
import { useProjectStore } from '~/store/project';
import { Transaction } from '~/store/transaction';

export interface Category {
  category: string;
}

export interface ColoredCategory extends Category {
  color: string;
}

interface State {
  categories: RemovableRef<ColoredCategory[]>;
}

export function getFullCategoryName(
  t: Pick<Transaction, 'category'>,
): string | undefined {
  if (!t.category) return t.category;
  return t.category.split('/')[0];
}

export function getMainCategoryName(
  t: Pick<Transaction, 'category'>,
): string | undefined {
  const fullName = getFullCategoryName(t);
  if (!fullName) return fullName;
  return fullName.split('/')[0];
}

export function getSubCategoryName(
  t: Pick<Transaction, 'category'>,
): string | undefined {
  const fullName = getFullCategoryName(t);
  if (!fullName) return fullName;
  const [, subName] = fullName.split('/');
  return subName;
}

export function decomposeRawCategoryToCategoryAndProject(
  rawCategoryName: string | undefined,
): [string | undefined, string | undefined] {
  if (!rawCategoryName) return [undefined, undefined];
  const [categoryName, projectName] = rawCategoryName.split('/');
  return [categoryName, projectName];
}

export function composeRawCategoryFromCategoryAndProject(
  categoryName: string | undefined,
  projectName: string | undefined,
): string {
  if (!categoryName && projectName) return '/' + projectName;
  return [categoryName, projectName].filter(Boolean).join('/');
}

export const useCategoryStore = defineStore('category', {
  state: (): State => ({
    categories: useLocalStorage<ColoredCategory[]>('category', []),
  }),
  actions: {
    create(rawCategory: Category | ColoredCategory) {
      if (!rawCategory.category) return;
      const [categoryName, projectName] =
        decomposeRawCategoryToCategoryAndProject(rawCategory.category);

      if (categoryName) {
        const categoryIndex = this.$state.categories.findIndex(
          (a) => a.category === categoryName,
        );

        const category: Category = { category: categoryName };
        if (categoryIndex >= 0) {
          const existing = this.$state.categories[categoryIndex];
          this.$state.categories.splice(
            categoryIndex,
            1,
            Object.assign(existing, category),
          );
        } else {
          this.$state.categories.push({
            ...category,
            color: getRandomColor(),
          });
        }
      }

      if (projectName) {
        const projectStore = useProjectStore();

        projectStore.create({
          project: projectName,
        });
      }
    },
    getColorByCategory(rawName: string): string {
      if (!rawName) return 'transparent';
      const name = rawName.split('/')[0];
      const category = this.$state.categories.find((c) => c.category === name);
      if (!category) return 'transparent';
      return category.color;
    },
  },
});
