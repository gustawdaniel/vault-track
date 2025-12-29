import assert from 'node:assert';
import { it, expect, describe, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCategoryStore } from '~/store/category';

describe('categories', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('create and retrieve 3 layers', () => {
    const categoryStore = useCategoryStore();

    categoryStore.create({ category: 'A' });
    categoryStore.create({ category: 'A:B' });
    categoryStore.create({ category: 'A:B:C' });

    const tree = categoryStore.tree;
    expect(tree.length).toBe(1);
    expect(tree[0].category).toBe('A');
    expect(tree[0].children.length).toBe(1);
    // Note: getSubCategories returns stripped name previously, but my new logic in tree getter uses full names?
    // Let's check my logic in tree getter:
    // .map(c => ({...root, children: buildTree(children)}))
    // I did NOT strip the category name in buildTree. So it should be full name.
    // Wait, the UI expects stripped names for display? 
    // The previous implementation stripped names: category: c.category.substring(r.category.length + 1)
    // My new implementation does NOT strip names. This might break UI display labels.
    // I should fix this in the store or UI. 
    // Usually UI wants just the leaf name.

    // Let's verify what I implemented:
    // c => c (in buildTree children filter)
    // So children will have full category "A:B", "A:B:C".

    // If I want to match previous behavior for UI, I should probably provide a "name" property or stripped "category".
    // But modifying "category" property is risky because it's the ID/Key.
    // Actually ID is uuid. Category string is the path.
    // Previous implementation: category: c.category.substring(r.category.length + 1)
    // This effectively CHANGED the category property in the returned tree object.
    // If UI relies on `category` being just the leaf name, I should probably do that too.

    // Let's check ExpandableListMainContent.vue: it uses `getName(item)` which calls `getNameFromExtendableListItem`.
    // I need to check `getNameFromExtendableListItem`.
  });
});
