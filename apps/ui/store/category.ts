import { RemovableRef, useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { uid } from 'uid';
import { getRandomColor } from '~/utils/getRandomColor';
import { useProjectStore } from '~/store/project';
import { Transaction } from '~/store/transaction';

export interface Category {
  category: string;
}

export interface ColoredCategory extends Category {
  color: string;
}

export interface PersistedCategory extends ColoredCategory {
  id: string;
}

interface State {
  categories: RemovableRef<PersistedCategory[]>;
}

class Cat {
  data: PersistedCategory;

  constructor(payload: Category | ColoredCategory | PersistedCategory) {
    console.log('payload', payload);
    this.data = {
      ...payload,
      color: 'color' in payload ? payload.color : getRandomColor(),
      id: 'id' in payload ? payload.id : uid(),
    };
  }

  get id(): string {
    return this.data.id;
  }

  get json(): PersistedCategory {
    return this.data;
  }

  get pureCategoryWithoutProject(): PersistedCategory {
    const [categoryName] = this.decomposeToCategoryAndProject();

    return {
      ...this.data,
      category: categoryName ?? '',
    };
  }

  decomposeToCategoryAndProject(): [string | undefined, string | undefined] {
    return decomposeRawCategoryToCategoryAndProject(this.data.category);
  }
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

export type CategoryTree = Array<
  PersistedCategory & {
    children: Array<PersistedCategory>;
  }
>;

export const useCategoryStore = defineStore('category', {
  state: (): State => ({
    categories: useLocalStorage<PersistedCategory[]>('category', []),
  }),
  actions: {
    create(rawCategory: Category | ColoredCategory) {
      if (!rawCategory.category) return;

      const cat = new Cat(rawCategory);

      const [categoryName, projectName] = cat.decomposeToCategoryAndProject();

      if (categoryName) {
        const categoryIndex = this.getIndexByName(categoryName);

        if (categoryIndex >= 0) {
          const existing = this.$state.categories[categoryIndex];
          this.$state.categories.splice(
            categoryIndex,
            1,
            Object.assign(existing, cat.pureCategoryWithoutProject),
          );
        } else {
          this.$state.categories.push(cat.pureCategoryWithoutProject);
        }
      }

      if (projectName) {
        const projectStore = useProjectStore();

        projectStore.create({
          project: projectName,
        });
      }
    },
    update(id: string, category: ColoredCategory) {
      const cat = new Cat({ ...category, id });
      const index = this.getIndexById(id);
      if (index !== -1) {
        this.$state.categories.splice(index, 1, cat.pureCategoryWithoutProject);
      } else {
        this.create(cat.json);
      }
    },
    delete(id: string): void {
      const index = this.getIndexById(id);
      if (index !== -1) {
        const category = this.getById(id);
        if (!category) return;

        if (!category.category.includes(':')) {
          const children = this.getSubCategories(category.category);
          children.forEach((c) => this.delete(c.id));
        }

        this.$state.categories.splice(index, 1);
      }
    },
    getIndexById(id: string): number {
      return this.$state.categories.findIndex((a) => a.id === id);
    },
    getIndexByName(name: string): number {
      return this.$state.categories.findIndex((a) => a.category === name);
    },
    getNew(): PersistedCategory {
      return {
        id: uid(),
        color: getRandomColor(),
        category: '',
      };
    },
    getById(id: string): PersistedCategory | undefined {
      return this.categories.find((c) => c.id === id);
    },
    getColorByCategory(rawName?: string): string {
      if (!rawName) return 'transparent';
      const name = rawName.split('/')[0];
      const category = this.$state.categories.find((c) => c.category === name);
      if (!category) return 'transparent';
      return category.color;
    },
    getSubCategories(rootCategoryName: string): PersistedCategory[] {
      return this.categories
        .filter(
          (c) =>
            c.category.startsWith(rootCategoryName) && c.category.includes(':'),
        )
        .map((c) => ({
          ...c,
          category: c.category.substring(rootCategoryName.length + 1),
        }));
    },
  },
  getters: {
    rootCategories(): PersistedCategory[] {
      return this.categories.reduce(
        (rootCategories: PersistedCategory[], c: PersistedCategory) => {
          const colonIndex = c.category.indexOf(':');

          const name = c.category.substring(
            0,
            colonIndex === -1 ? undefined : colonIndex,
          );

          const exists = rootCategories.map((c) => c.category).includes(name);

          return exists
            ? rootCategories
            : rootCategories.concat({ ...c, category: name });
        },
        [],
      );
    },
    tree(): CategoryTree {
      const root = this.rootCategories;

      return root
        .map((r) => {
          const children = this.categories
            .filter(
              (c) =>
                c.category.startsWith(r.category + ':') &&
                c.category.includes(':'),
            )
            .map((c) => ({
              ...c,
              category: c.category.substring(r.category.length + 1),
            }))
            .sort((c1, c2) => c1.category.localeCompare(c2.category));

          return {
            ...r,
            children,
          };
        })
        .sort((c1, c2) => c1.category.localeCompare(c2.category));
    },
  },
});
