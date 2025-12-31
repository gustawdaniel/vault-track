import { type RemovableRef, useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { uid } from 'uid';
import { getRandomColor } from '~/utils/getRandomColor';
import { useProjectStore } from '~/store/project';
import type { Transaction } from '~/store/transaction';

export interface Category {
  category: string;
}

export interface ColoredCategory extends Category {
  color: string;
}

export interface PersistedCategory extends ColoredCategory {
  id: string;
  order: number;
}

interface State {
  categories: RemovableRef<PersistedCategory[]>;
}

class Cat {
  data: PersistedCategory;

  constructor(payload: Category | ColoredCategory | PersistedCategory) {
    this.data = {
      ...payload,
      color: 'color' in payload ? payload.color : getRandomColor(),
      id: 'id' in payload ? payload.id : uid(),
      order: 'order' in payload ? payload.order : 0,
    };
  }
  // ... (rest of class)

  // ... (in actions)


  // ... (in getters)

  get id(): string {
    return this.data.id;
  }

  get json(): PersistedCategory {
    return this.data;
  }

  get isRoot(): boolean {
    return !this.pureCategoryWithoutProject.category.includes(':');
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

// ... existing code ...
export type CategoryTree = Array<
  PersistedCategory & {
    children: CategoryTree;
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
        // Ensure parent exists
        if (categoryName.includes(':')) {
          const parts = categoryName.split(':');
          // Remove the last part to get the parent path
          parts.pop();
          const parentName = parts.join(':');

          if (this.getIndexByName(parentName) === -1) {
            const { id, ...rest } = cat.json;
            this.create({ ...rest, category: parentName });
          }
        }

        const categoryIndex = this.getIndexByName(categoryName);

        if (categoryIndex >= 0) {
          const existing = this.$state.categories[categoryIndex];
          if (existing) {
            // Preserve existing order
            cat.data.order = existing.order || 0;
            this.$state.categories.splice(
              categoryIndex,
              1,
              Object.assign(existing, cat.pureCategoryWithoutProject),
            );
          }
        } else {
          // New Item: Assign order = max(siblings.order) + 1
          const parentPrefix = categoryName.includes(':')
            ? categoryName.substring(0, categoryName.lastIndexOf(':'))
            : null;

          let siblings: PersistedCategory[];
          if (parentPrefix) {
            siblings = this.categories.filter(c => {
              return c.category.startsWith(parentPrefix + ':') &&
                !c.category.substring(parentPrefix.length + 1).includes(':');
            });
          } else {
            siblings = this.categories.filter(c => !c.category.includes(':'));
          }

          const maxOrder = siblings.reduce((max, c) => Math.max(max, c.order || 0), 0);
          cat.data.order = maxOrder + 1;

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
    reorder(newOrder: CategoryTree) {
      newOrder.forEach((item, index) => {
        const catIndex = this.getIndexById(item.id);
        if (catIndex !== -1) {
          const existing = this.$state.categories[catIndex];
          if (existing) existing.order = index;
        }

        if (item.children && item.children.length > 0) {
          this.reorder(item.children);
        }
      });
    },
    update(id: string, category: ColoredCategory) {
      // Find existing to get its order
      const existingBefore = this.getById(id);
      const existingOrder = existingBefore ? existingBefore.order : 0;

      const cat = new Cat({ ...category, id, order: existingOrder }); // Pass existingOrder
      const index = this.getIndexById(id);
      if (index !== -1) {
        const categoryBeforeUpdate = this.getById(id);
        if (categoryBeforeUpdate) {
          // Get all descendants
          const allDescendants = this.getSubCategories(categoryBeforeUpdate.category);

          // Filter for DIRECT children only to avoid double recursion
          const directChildren = allDescendants.filter(c => {
            const remainder = c.category.substring(categoryBeforeUpdate.category.length + 1);
            return !remainder.includes(':');
          });

          directChildren.forEach((sub) => {
            const subIndex = this.getIndexById(sub.id);
            if (subIndex === -1) return;

            // We need to replace the prefix for ALL descendants
            const oldPrefix = categoryBeforeUpdate.category;
            const newPrefix = cat.pureCategoryWithoutProject.category;

            const relativePath = sub.category.substring(oldPrefix.length + 1);
            const newCategoryName = `${newPrefix}:${relativePath}`;

            this.update(sub.id, {
              ...sub,
              category: newCategoryName,
            });
          });
        }

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

        // Get all descendants
        const allDescendants = this.getSubCategories(category.category);

        // Filter for DIRECT children only to avoid redundant calls (since delete is recursive)
        const directChildren = allDescendants.filter(c => {
          const remainder = c.category.substring(category.category.length + 1);
          return !remainder.includes(':');
        });

        directChildren.forEach((c) => this.delete(c.id));

        // Check index again
        const newIndex = this.getIndexById(id);
        if (newIndex !== -1) {
          this.$state.categories.splice(newIndex, 1);
        }
      }
    },
    getIndexById(id: string): number {
      return this.$state.categories.findIndex((a) => a.id === id);
    },
    getByName(name: string): PersistedCategory | undefined {
      return this.$state.categories.find((a) => a.category === name);
    },
    getIndexByName(name: string): number {
      return this.$state.categories.findIndex((a) => a.category === name);
    },
    getNew(): PersistedCategory {
      return {
        id: uid(),
        color: getRandomColor(),
        category: '',
        order: 0,
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
        .filter((c) => c.category.startsWith(rootCategoryName + ':'))
        // Do NOT strip the prefix here, return the full object so we can use it properly in recursion
        // Wait, the original was returning partial objects? 
        // Original: category: c.category.substring(rootCategoryName.length + 1)
        // This was returning "relative" category names.
        // But for update/delete we need real IDs and real full names.

        // Let's modify this to return exact objects from store.
        // But wait, the original usage might depend on relative names?
        // update() used it for recursion: ...cat.pureCategoryWithoutProject, ...category: ${cat...}:${sub.category}
        // It seems it was using relative name.

        // If I change this behaviour I might break things.
        // But for deep recursion, handling "relative" path is tricky if we don't know depth.
        // Let's return the FULL category objects.
        // And we will use full names.
        .map(c => c);
    },
  },
  getters: {
    rootCategories(): PersistedCategory[] {
      const sorted = [...this.categories].sort(
        (a: PersistedCategory, b: PersistedCategory) =>
          a.category.length - b.category.length,
      );

      return sorted.reduce(
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
      const buildTree = (roots: PersistedCategory[], prefix: string = ''): CategoryTree => {
        return roots.map(root => {
          const fullRootPath = root.category;

          const children = this.categories
            .filter(c => c.category.startsWith(fullRootPath + ':'))
            .filter(c => {
              const remainder = c.category.substring(fullRootPath.length + 1);
              return !remainder.includes(':');
            })
            .sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id)); // Use ID as tiebreaker

          const strippedCategory = prefix
            ? root.category.substring(prefix.length + 1)
            : root.category;

          return {
            ...root,
            category: strippedCategory,
            children: buildTree(children, fullRootPath)
          };
        }).sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id)); // Use ID as tiebreaker
      };

      // Get actual root items from the store (items with no ':')
      const roots = this.categories
        .filter(c => !c.category.includes(':'))
        .sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id)); // Use ID as tiebreaker

      return buildTree(roots);
    },
  },
});
