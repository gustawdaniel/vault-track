/**
 * Automatic categories for transactions that arrive without one.
 *
 * Order of evidence:
 *  1. keywords the user wrote on a category (Category.keywords),
 *  2. the category the user already gave to the same payee (history; a clear majority is required),
 *  3. built-in keywords for obvious merchants (only for categories that exist in the group).
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
    /** sign decides between income and expense history; unknown (0/undefined) looks at both */
    amount?: number | null;
}

export interface CategorySuggestion {
    category: string;
    reason: 'keyword' | 'history' | 'mcc' | 'default';
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
    ['opłata za prowadzenie rachunku', 'Financial:Account maintenance'],
    ['odsetki debetowe', 'Financial:Bank fees'],
    ['digitalocean', 'Professional:Servers'],
];

/** Merchant category codes (card schemes, BLIK) → category, used when nothing better is known. */
export const MCC_CATEGORIES: Array<[RegExp, string]> = [
    [/^4112$/, 'Transport:Train'],
    [/^4111$/, 'Transport'],
    [/^4131$/, 'Transport:Bus'],
    [/^4121$/, 'Transport:Car'],
    [/^(3\d{3}|4511)$/, 'Transport:Plane'],
    [/^(5411|5499|5422|5441|5451)$/, 'Food:Groceries'],
    [/^(5812|5813|5814|5462)$/, 'Food:Eating out'],
    [/^5912$/, 'Health:Pharmacy'],
    [/^(80[0-9]{2}|8099)$/, 'Health'],
    [/^(7372|5734|5817|5818)$/, 'Professional:Apps'],
    [/^(4814|4816|4899)$/, 'Professional:Internet'],
    [/^(7011|7012)$/, 'Fun:Travel leisure'],
    [/^(7941|7997)$/, 'Fun:Sport'],
];

/** "MCC 4112" written by importers into the memo (Revolut web app, card statements). */
export function mccOf(tx: { memo?: string | null }): string | null {
    return (tx.memo ?? '').match(/\bMCC (\d{4})\b/)?.[1] ?? null;
}

const NO_CATEGORY = new Set(['', 'other:uncategorized']);

/**
 * A category that says something about the money: not empty, not "Uncategorized" and not a transfer.
 * Transfers move money between the user's own accounts ("[Account]" in QIF; "Transfer", "Transfer:Atm"
 * are the same thing written as a category), so they are never learned from history nor suggested.
 */
export function isMeaningfulCategory(category?: string | null): category is string {
    const value = (category ?? '').trim();
    if (NO_CATEGORY.has(value.toLowerCase())) return false;
    if (/^transfer(:|\/|$)/i.test(value)) return false;
    return !value.startsWith('[');
}

/** Lowercase, without Polish letters and diacritics: banks write "SZKOLA" and "SZKOŁA" for the same payee. */
/** "[mBank Prywatne]": money moved to one of my own accounts (QIF transfer). */
export function isOwnTransfer(category?: string | null): boolean {
    return /^\[.+\]/.test((category ?? '').trim());
}

function clean(value?: string | null): string {
    return (value ?? '')
        .replace(/\u00a0/g, ' ')
        .toLowerCase()
        .replace(/ł/g, 'l')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/https?:\/\//g, '')
        .replace(/\bwww\./g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Payee without numbers, ids and punctuation noise: "www.koleo.pl Francuska 11a" → "koleo.pl francuska". */
export function payeeKey(payee?: string | null): string {
    return clean(payee)
        .split(' ')
        .map((word) => {
            // a card or account ending ("*3337") tells payees apart; long numbers and ids do not
            if (/^\*?\d{2,4}$/.test(word)) return word;
            if (/\d/.test(word)) return '';
            return word.replace(/^[^\p{L}]+|[^\p{L}.]+$/gu, '');
        })
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

type Direction = 'in' | 'out';

interface HistoryEntry {
    counts: Record<Direction, Map<string, number>>;
}

function direction(amount?: number | null): Direction | null {
    if (!amount) return null;
    return amount > 0 ? 'in' : 'out';
}

export function createCategorizer(
    categories: CategoryDefinition[],
    history: CategorizedTransaction[],
) {
    const existing = new Set(categories.map((c) => c.category));
    const userKeywords: Array<[string, string]> = categories.flatMap((c) =>
        (c.keywords ?? []).map((k) => [clean(k), c.category] as [string, string]),
    ).filter(([k]) => k.length > 0)
        .sort((a, b) => b[0].length - a[0].length);
    const defaults = DEFAULT_KEYWORDS
        .filter(([, category]) => existing.size === 0 || existing.has(category))
        .map(([keyword, category]) => [clean(keyword), category] as [string, string]);

    const byPayee = new Map<string, HistoryEntry>();
    for (const tx of history) {
        // a move to one of my accounts ("[Millennium Bank]") is learned too, but suggested only when it is clear
        if (!isMeaningfulCategory(tx.category) && !isOwnTransfer(tx.category)) continue;
        const key = payeeKey(tx.payee);
        const dir = direction(tx.amount);
        if (key.length < 3 || !dir) continue;
        const entry = byPayee.get(key) ?? { counts: { in: new Map(), out: new Map() } };
        const category = tx.category!.split('/')[0]!;
        entry.counts[dir].set(category, (entry.counts[dir].get(category) ?? 0) + 1);
        byPayee.set(key, entry);
    }

    function fromHistory(payee?: string | null, amount?: number | null): CategorySuggestion | null {
        const key = payeeKey(payee);
        if (key.length < 3) return null;
        // the same payee, or one whose name starts the other's ("koleo.pl" ~ "koleo.pl francuska warszawa")
        const keys: string[] = [];
        for (const other of byPayee.keys()) {
            const shorter = other.length < key.length ? other : key;
            const longer = other.length < key.length ? key : other;
            // banks cut long names ("…MAŁGORZATA PASZE"), so a long name may end in the middle of a word
            const cut = shorter.length >= 20 && longer.startsWith(shorter);
            if (longer === shorter || cut || (shorter.length >= 5 && longer.startsWith(shorter + ' '))) keys.push(other);
        }
        // money in and money out are different stories: a refund to a client is not the client's payment
        const dir = direction(amount);
        const dirs: Direction[] = dir ? [dir] : ['in', 'out'];
        const counts = new Map<string, number>();
        let total = 0;
        for (const k of keys) {
            for (const d of dirs) {
                for (const [category, count] of byPayee.get(k)!.counts[d]) {
                    counts.set(category, (counts.get(category) ?? 0) + count);
                    total += count;
                }
            }
        }
        if (total === 0) return null;
        const [best, count] = [...counts].sort((a, b) => b[1] - a[1])[0]!;
        if (count / total < 0.6) return null;
        if (isOwnTransfer(best) && (count < 3 || count / total < 0.9)) return null;
        return { category: best, reason: 'history', match: keys.join(', ') };
    }

    return function suggest(tx: CategorizedTransaction): CategorySuggestion | null {
        const text = `${clean(tx.payee)} ${clean(tx.memo)}`;
        // the user's keywords match anywhere ("grawitacja" in "stacjagrawitacja.pl"), built-in ones as whole words
        for (const [keyword, category] of userKeywords) {
            if (text.includes(keyword)) return { category, reason: 'keyword', match: keyword };
        }
        const history = fromHistory(tx.payee, tx.amount);
        if (history) return history;
        const mcc = mccOf(tx);
        const byMcc = mcc ? MCC_CATEGORIES.find(([pattern, category]) => pattern.test(mcc) && (existing.size === 0 || existing.has(category))) : null;
        if (byMcc) return { category: byMcc[1], reason: 'mcc', match: `MCC ${mcc}` };
        for (const [keyword, category] of defaults) {
            if (containsKeyword(text, keyword)) return { category, reason: 'default', match: keyword };
        }
        return null;
    };
}
