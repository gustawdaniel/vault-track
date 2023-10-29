import assert from 'node:assert';
import { it, expect, describe, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCategoryStore } from '~/store/category';

describe('categories', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('update of root', () => {
    const categoryStore = useCategoryStore();

    categoryStore.create({ category: 'x' });
    categoryStore.create({ category: 'x:x' });

    const category = categoryStore.getByName('x');
    expect(category).toBeDefined();
    assert.ok(category);

    categoryStore.update(category.id, { category: 'y', color: category.color });

    const namesAfterUpdate = categoryStore.categories.map((c) => c.category);
    expect(namesAfterUpdate).eql(['y', 'y:x']);
  });
});
