import { RemovableRef, useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';

export interface Category {
  category: string;
}

interface State {
  categories: RemovableRef<Category[]>;
}

export const useCategoryStore = defineStore('category', {
  state: (): State => ({
    categories: useLocalStorage<Category[]>('category', []),
  }),
  actions: {
    create(category: Category) {
      const index = this.$state.categories.findIndex(
        (a) => a.category === category.category,
      );
      if (index >= 0) {
        this.$state.categories.splice(index, 1, category);
      } else {
        this.$state.categories.push(category);
      }
    },
  },
});
