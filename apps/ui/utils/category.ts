import type { Transaction } from '~/store/transaction.model';

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
