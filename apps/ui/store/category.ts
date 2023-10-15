import { RemovableRef, useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { getRandomColor } from '~/utils/getRandomColor';

export interface Category {
  category: string;
}

export interface ColoredCategory extends Category {
  color: string;
}

interface State {
  categories: RemovableRef<ColoredCategory[]>;
}

export const useCategoryStore = defineStore('category', {
  state: (): State => ({
    categories: useLocalStorage<ColoredCategory[]>('category', []),
  }),
  actions: {
    create(category: Category | ColoredCategory) {
      const index = this.$state.categories.findIndex(
        (a) => a.category === category.category,
      );
      if (index >= 0) {
        const existing = this.$state.categories[index];
        this.$state.categories.splice(
          index,
          1,
          Object.assign(existing, category),
        );
      } else {
        this.$state.categories.push({
          ...category,
          color: getRandomColor(),
        });
      }
    },
    getColorByCategory(name: string): string {
      const category = this.$state.categories.find((c) => c.category === name);
      if (!category) return 'transparent';
      return category.color;
    },
  },
});
