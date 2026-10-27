/**
 * Automatic categories for transactions that arrive without one.
 *
 * Order of evidence:
 *  1. keywords the user wrote on a category (Category.keywords),
 *  2. built-in keywords for obvious merchants (only for categories that exist in the group),
 *  3. the category the user already gave to the same payee (history; a clear majority is required).
 *
 * The web app has a copy of this module (apps/svelte/src/lib/categorize.ts); keep the two in step.
 */

export interface CategoryDefinition {
    category: string;
    keywords?: string[];
}

export interface CategorizedTransaction {
    payee?: string | null;
    memo?: string | null;
    category?: string | null;
}

export interface CategorySuggestion {
    category: string;
    reason: 'keyword' | 'history' | 'default';
    match: string;
}

/** Obvious merchants: lowercase keyword → category. */
export const DEFAULT_KEYWORDS: Array<[string, string]> = [
    ['koleo', 'Transport:Train'],
    ['intercity', 'Transport:Train'],
    ['polregio', 'Transport:Train'],
    ['skm', 'Transport:Train'],
    ['jakdojade', 'Transport'],
    ['flixbus', 'Transport:Bus'],
    ['bolt.eu', 'Transport:Car'],
    ['uber', 'Transport:Car'],
    ['ryanair', 'Transport:Plane'],
    ['wizz air', 'Transport:Plane'],
    ['biedronka', 'Food:Groceries'],
    ['lidl', 'Food:Groceries'],
    ['żabka', 'Food:Groceries'],
    ['zabka', 'Food:Groceries'],
    ['carrefour', 'Food:Groceries'],
    ['auchan', 'Food:Groceries'],
    ['kaufland', 'Food:Groceries'],
    ['wolt', 'Food:Eating out'],
    ['pyszne.pl', 'Food:Eating out'],
    ['glovo', 'Food:Eating out'],
    ['booking.com', 'Fun:Travel leisure'],
    ['airbnb', 'Fun:Travel leisure'],
    ['inpost', 'Shipping:InPost'],
    ['alab', 'Health:Medical tests'],
    ['diagnostyka', 'Health:Medical tests'],
    ['apteka', 'Health:Pharmacy'],
    ['bankomat', 'Transfer:Atm'],
    ['opłata za prowadzenie rachunku', 'Financial:Account maintenance'],
    ['odsetki debetowe', 'Financial:Bank fees'],
    ['digitalocean', 'Professional:Servers'],
];

const NO_CATEGORY = new Set(['', 'other:uncategorized']);

/** A category that says something: not empty, not "Uncategorized", not a transfer ([Account]). */
export function isMeaningfulCategory(category?: string | null): category is string {
    const value = (category ?? '').trim();
    if (NO_CATEGORY.has(value.toLowerCase())) return false;
    return !value.startsWith('[');
}

function clean(value?: string | null): string {
    return (value ?? '')
        .replace(/ /g, ' ')
        .toLowerCase()
        .replace(/https?:\/\//g, '')
        .replace(/\bwww\./g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Payee without numbers, ids and punctuation noise: "www.koleo.pl Francuska 11a" → "koleo.pl francuska". */
export function payeeKey(payee?: string | null): string {
    return clean(payee)
        .split(' ')
        .filter((word) => word && !/\d/.test(word))
        .map((word) => word.replace(/^[^\p{L}]+|[^\p{L}.]+$/gu, ''))
        .filter(Boolean)
        .slice(0, 6)
        .join(' ');
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsKeyword(text: string, keyword: string): boolean {
    const k = keyword.trim().toLowerCase();
    if (!k) return false;
    return new RegExp(`(^|[^\\p{L}])${escapeRegExp(k)}($|[^\\p{L}])`, 'u').test(text);
}

interface HistoryEntry {
    counts: Map<string, number>;
    total: number;
}

export function createCategorizer(
    categories: CategoryDefinition[],
    history: CategorizedTransaction[],
) {
    const existing = new Set(categories.map((c) => c.category));
    const userKeywords: Array<[string, string]> = categories.flatMap((c) =>
        (c.keywords ?? []).map((k) => [k.trim().toLowerCase(), c.category] as [string, string]),
    ).filter(([k]) => k.length > 0)
        .sort((a, b) => b[0].length - a[0].length);
    const defaults = DEFAULT_KEYWORDS.filter(([, category]) => existing.size === 0 || existing.has(category));

    const byPayee = new Map<string, HistoryEntry>();
    for (const tx of history) {
        if (!isMeaningfulCategory(tx.category)) continue;
        const key = payeeKey(tx.payee);
        if (key.length < 3) continue;
        const entry = byPayee.get(key) ?? { counts: new Map(), total: 0 };
        const category = tx.category.split('/')[0]!;
        entry.counts.set(category, (entry.counts.get(category) ?? 0) + 1);
        entry.total++;
        byPayee.set(key, entry);
    }

    function fromHistory(payee?: string | null): CategorySuggestion | null {
        const key = payeeKey(payee);
        if (key.length < 3) return null;
        // the same payee, or one whose name starts the other's ("koleo.pl" ~ "koleo.pl francuska warszawa")
        const entries: Array<[string, HistoryEntry]> = [];
        const exact = byPayee.get(key);
        if (exact) entries.push([key, exact]);
        else {
            for (const [other, entry] of byPayee) {
                const shorter = other.length < key.length ? other : key;
                const longer = other.length < key.length ? key : other;
                if (shorter.length >= 5 && (longer === shorter || longer.startsWith(shorter + ' '))) {
                    entries.push([other, entry]);
                }
            }
        }
        const counts = new Map<string, number>();
        let total = 0;
        for (const [, entry] of entries) {
            for (const [category, count] of entry.counts) counts.set(category, (counts.get(category) ?? 0) + count);
            total += entry.total;
        }
        if (total === 0) return null;
        const [best, count] = [...counts].sort((a, b) => b[1] - a[1])[0]!;
        if (count / total < 0.6) return null;
        return { category: best, reason: 'history', match: entries.map(([k]) => k).join(', ') };
    }

    return function suggest(tx: CategorizedTransaction): CategorySuggestion | null {
        const text = `${clean(tx.payee)} ${clean(tx.memo)}`;
        // the user's keywords match anywhere ("grawitacja" in "stacjagrawitacja.pl"), built-in ones as whole words
        for (const [keyword, category] of userKeywords) {
            if (text.includes(keyword)) return { category, reason: 'keyword', match: keyword };
        }
        for (const [keyword, category] of defaults) {
            if (containsKeyword(text, keyword)) return { category, reason: 'default', match: keyword };
        }
        return fromHistory(tx.payee);
    };
}
