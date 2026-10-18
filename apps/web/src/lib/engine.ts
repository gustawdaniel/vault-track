import {
  type Account,
  type Assert,
  type Currency,
  CRYPTO_CURRENCIES,
  type EnrichedAssert,
  type EnrichedTransaction,
  type FailingAssert,
  type LedgerFilter,
  type PersistedCategory,
  type TimelineItem,
  type Transaction,
} from './types';

export function getCurrencyDigits(currency: Currency): 2 | 8 {
  return (CRYPTO_CURRENCIES as string[]).includes(currency) ? 8 : 2;
}

export function roundCurrency(value: number, currency: Currency = 'PLN'): number {
  const digits = getCurrencyDigits(currency);
  const scale = Math.pow(10, digits);
  return Math.round(value * scale) / scale;
}

export function sumMoney(a: number, b: number, currency: Currency = 'PLN'): number {
  const digits = getCurrencyDigits(currency);
  const scale = Math.pow(10, digits);
  return Math.round(a * scale + b * scale) / scale;
}

export function formatMoney(amount: number, currency: Currency = 'PLN', showSign = false): string {
  const digits = getCurrencyDigits(currency);
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('pl-PL', {
    minimumFractionDigits: digits === 8 ? 4 : 2,
    maximumFractionDigits: digits,
  });
  const sign = amount < 0 ? '−' : showSign && amount > 0 ? '+' : '';
  return `${sign}${formatted} ${currency}`;
}

export function isTransferCategory(category?: string): boolean {
  if (!category) return false;
  return category.startsWith('[') && category.includes(']');
}

export function extractTransferTarget(category?: string): string | undefined {
  if (!isTransferCategory(category)) return undefined;
  const match = category!.match(/^\[(.*?)\]/);
  return match ? match[1] : undefined;
}

export function parseCategoryAndProject(rawCategory?: string): {
  categoryName: string;
  projectName: string;
} {
  if (!rawCategory) return { categoryName: '', projectName: '' };
  const [catPart, projPart] = rawCategory.split('/');
  return {
    categoryName: catPart ?? '',
    projectName: projPart ?? '',
  };
}

export interface ComputedAccountWithMeta extends Account {
  balance: number;
  txCount: number;
  failedAssertsCount: number;
  lastAssertDate?: string;
}

/**
 * Computes balances, transaction counts, and reconciliation status for all accounts in a single pass.
 */
export function computeAccountsAndReconciliation(
  accounts: Account[],
  transactions: Transaction[],
  asserts: Assert[],
): {
  accountsWithMeta: ComputedAccountWithMeta[];
  failingAsserts: FailingAssert[];
  assertStatusById: Map<string, EnrichedAssert>;
  runningBalanceByTxId: Map<string, number>;
} {
  const accountMap = new Map<string, Account>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  // Group transactions by accountId
  const txsByAccount = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    let list = txsByAccount.get(tx.accountId);
    if (!list) {
      list = [];
      txsByAccount.set(tx.accountId, list);
    }
    list.push(tx);
  }

  // Group asserts by accountId
  const assertsByAccount = new Map<string, Assert[]>();
  for (const a of asserts) {
    let list = assertsByAccount.get(a.accountId);
    if (!list) {
      list = [];
      assertsByAccount.set(a.accountId, list);
    }
    list.push(a);
  }

  const failingAsserts: FailingAssert[] = [];
  const assertStatusById = new Map<string, EnrichedAssert>();
  const runningBalanceByTxId = new Map<string, number>();
  const balanceByAccountId = new Map<string, number>();
  const failedCountByAccountId = new Map<string, number>();

  for (const acc of accounts) {
    const accTxs = (txsByAccount.get(acc.id) || []).slice().sort((a, b) => {
      const d = (a.date || '').localeCompare(b.date || '');
      return d !== 0 ? d : a.id.localeCompare(b.id);
    });

    const accAsserts = (assertsByAccount.get(acc.id) || []).slice().sort((a, b) =>
      (a.date || '').localeCompare(b.date || '')
    );

    let running = 0;
    let assertIdx = 0;

    const evaluateAssert = (assertion: Assert, actualBalance: number) => {
      const diff = roundCurrency(actualBalance - assertion.value, acc.currency);
      const passed = Math.abs(diff) < 0.005;
      const enriched: EnrichedAssert = {
        ...assertion,
        accountName: acc.name,
        currency: acc.currency,
        actualBalance,
        diff,
        passed,
      };
      assertStatusById.set(assertion.id, enriched);
      if (!passed) {
        failingAsserts.push({
          id: assertion.id,
          accountId: acc.id,
          accountName: acc.name,
          currency: acc.currency,
          date: assertion.date,
          expected: assertion.value,
          actual: actualBalance,
          diff,
        });
        failedCountByAccountId.set(acc.id, (failedCountByAccountId.get(acc.id) || 0) + 1);
      }
    };

    for (const tx of accTxs) {
      const txDay = (tx.date || '').split('T')[0] || '';
      while (assertIdx < accAsserts.length) {
        const curAssert = accAsserts[assertIdx]!;
        if (curAssert.date < txDay) {
          evaluateAssert(curAssert, running);
          assertIdx++;
        } else {
          break;
        }
      }
      running = sumMoney(running, tx.amount, acc.currency);
      runningBalanceByTxId.set(tx.id, running);
    }

    while (assertIdx < accAsserts.length) {
      evaluateAssert(accAsserts[assertIdx]!, running);
      assertIdx++;
    }

    balanceByAccountId.set(acc.id, running);
  }

  const accountsWithMeta: ComputedAccountWithMeta[] = accounts
    .slice()
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name))
    .map((acc) => {
      const accAsserts = assertsByAccount.get(acc.id) || [];
      const latestAssert = accAsserts.reduce<string | undefined>(
        (max, cur) => (!max || cur.date > max ? cur.date : max),
        undefined,
      );
      return {
        ...acc,
        balance: balanceByAccountId.get(acc.id) ?? 0,
        txCount: (txsByAccount.get(acc.id) || []).length,
        failedAssertsCount: failedCountByAccountId.get(acc.id) ?? 0,
        lastAssertDate: latestAssert,
      };
    });

  failingAsserts.sort((a, b) => b.date.localeCompare(a.date));

  return {
    accountsWithMeta,
    failingAsserts,
    assertStatusById,
    runningBalanceByTxId,
  };
}

/**
 * Builds the filtered ledger timeline (newest first) interleaving transactions and balance assertions.
 */
export function buildLedgerTimeline(
  transactions: Transaction[],
  asserts: Assert[],
  accounts: Account[],
  categories: PersistedCategory[],
  filter: LedgerFilter,
  runningBalanceByTxId: Map<string, number>,
  assertStatusById: Map<string, EnrichedAssert>,
): TimelineItem[] {
  const accountMap = new Map<string, Account>();
  for (const a of accounts) accountMap.set(a.id, a);

  const categoryColorMap = new Map<string, string>();
  for (const c of categories) categoryColorMap.set(c.category, c.color);

  const searchLower = filter.search.trim().toLowerCase();

  const items: TimelineItem[] = [];

  for (const tx of transactions) {
    if (filter.accountId && tx.accountId !== filter.accountId) continue;
    if (filter.dateFrom && tx.date < filter.dateFrom) continue;
    if (filter.dateTo && tx.date > filter.dateTo) continue;

    const isTransfer = isTransferCategory(tx.category);
    const { categoryName, projectName } = parseCategoryAndProject(tx.category);

    if (filter.type === 'expense' && (tx.amount >= 0 || isTransfer)) continue;
    if (filter.type === 'income' && (tx.amount <= 0 || isTransfer)) continue;
    if (filter.type === 'transfer' && !isTransfer) continue;
    if (filter.type === 'uncategorized' && categoryName !== '') continue;

    if (filter.category) {
      const matchesCat =
        categoryName === filter.category || categoryName.startsWith(filter.category + ':');
      if (!matchesCat) continue;
    }

    if (filter.project && projectName !== filter.project) continue;

    if (searchLower) {
      const hay = `${tx.payee || ''} ${tx.category || ''} ${tx.memo || ''} ${tx.account || ''} ${tx.amount}`.toLowerCase();
      if (!hay.includes(searchLower)) continue;
    }

    const acc = accountMap.get(tx.accountId);
    const currency: Currency = acc?.currency || 'PLN';
    const rootCat = categoryName.split(':')[0] || '';
    const color =
      categoryColorMap.get(categoryName) ||
      categoryColorMap.get(rootCat) ||
      (isTransfer ? '#38bdf8' : '#64748b');

    const enriched: EnrichedTransaction = {
      ...tx,
      currency,
      runningBalance: runningBalanceByTxId.get(tx.id) ?? 0,
      categoryName,
      projectName,
      categoryColor: color,
      isTransfer,
      transferTarget: extractTransferTarget(tx.category),
    };

    items.push({
      kind: 'transaction',
      date: (tx.date || '').split('T')[0] || tx.date,
      sortKey: `${(tx.date || '').split('T')[0]}_0_${tx.id}`,
      tx: enriched,
    });
  }

  // Include asserts when viewing all or a specific account without narrow category/project filters
  const showAsserts =
    !filter.category && !filter.project && filter.type === 'all' && !searchLower;

  if (showAsserts) {
    for (const a of asserts) {
      if (filter.accountId && a.accountId !== filter.accountId) continue;
      if (filter.dateFrom && a.date < filter.dateFrom) continue;
      if (filter.dateTo && a.date > filter.dateTo) continue;

      const enriched = assertStatusById.get(a.id);
      if (!enriched) continue;

      items.push({
        kind: 'assert',
        date: a.date,
        sortKey: `${a.date}_1_${a.id}`,
        assertion: enriched,
      });
    }
  }

  // Sort newest first; on the same date, asserts appear at end-of-day (above transactions of that day)
  items.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  return items;
}
