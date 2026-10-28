import { ledgerDay } from './dates';
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
  const value = category.trim();
  return (
    value === 'Transfer' ||
    value.startsWith('Transfer:') ||
    (value.startsWith('[') && value.includes(']'))
  );
}

export function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    // NFD does not decompose the Polish stroked l, so map it explicitly.
    .replace(/[łŁ]/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function isUncategorizedCategory(category?: string): boolean {
  const value = (category ?? '').trim();
  return !value || value === 'Other:Uncategorized' || value.startsWith('Other:Uncategorized:');
}

function flattenSearchValue(value: unknown, depth = 0): string {
  if (value === null || value === undefined || depth > 3) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => flattenSearchValue(item, depth + 1)).join(' ');
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((item) => flattenSearchValue(item, depth + 1))
      .join(' ');
  }
  return '';
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
    // the ledger counts a transaction on the day the bank booked it, or on the day it was made while pending
    const accTxs = (txsByAccount.get(acc.id) || []).slice().sort((a, b) => {
      const d = ledgerDay(a).localeCompare(ledgerDay(b));
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
      const txDay = ledgerDay(tx);
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

  const searchLower = normalizeSearchText(filter.search);

  const items: TimelineItem[] = [];

  for (const tx of transactions) {
    // A text query is a global search: it deliberately spans all accounts so
    // a merchant in a different account is still findable.
    if (filter.accountId && !searchLower && tx.accountId !== filter.accountId) continue;
    if (filter.dateFrom && tx.date < filter.dateFrom) continue;
    if (filter.dateTo && tx.date > filter.dateTo) continue;

    const isTransfer = isTransferCategory(tx.category);
    const { categoryName, projectName } = parseCategoryAndProject(tx.category);

    if (filter.type === 'expense' && (tx.amount >= 0 || isTransfer)) continue;
    if (filter.type === 'income' && (tx.amount <= 0 || isTransfer)) continue;
    if (filter.type === 'transfer' && !isTransfer) continue;
    if (filter.type === 'uncategorized' && !isUncategorizedCategory(categoryName)) continue;

    if (filter.category) {
      const matchesCat =
        categoryName === filter.category || categoryName.startsWith(filter.category + ':');
      if (!matchesCat) continue;
    }

    if (filter.project && projectName !== filter.project) continue;

    if (searchLower) {
      const hay = normalizeSearchText([
        tx.payee,
        tx.category,
        tx.memo,
        tx.account,
        tx.amount,
        tx.externalId,
        tx.clearedStatus,
        tx.transferHash,
        flattenSearchValue((tx as any).rawSource),
      ].join(' '));
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

export interface MonthlyAnalyticsPoint {
  month: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  transfers: number;
  transferVolume: number;
}

const MONTH_LABELS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

function monthLabel(month: string): string {
  const [year, m] = month.split('-');
  return `${MONTH_LABELS[Number(m) - 1] || m} ${String(year).slice(2)}`;
}

function enumerateMonths(start: string, end: string): string[] {
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  if (!startYear || !startMonth || !endYear || !endMonth) return [];

  const months: string[] = [];
  let year = startYear;
  let month = startMonth;
  while ((year < endYear || (year === endYear && month <= endMonth)) && months.length < 120) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

/**
 * Monthly income/expense and transfer activity for the analytics tab.
 * Transfer pairs (same `transferHash`) are counted once; single-sided ATM/BLIK
 * transfers are counted by transaction id.
 */
export function buildMonthlyAnalytics(
  transactions: EnrichedTransaction[],
  baseCurrency: Currency,
  dateFrom: string,
  dateTo: string,
  convert: (amount: number, from: Currency, to: Currency) => number,
  maxMonths = 24,
): MonthlyAnalyticsPoint[] {
  type MonthStat = {
    income: number;
    expense: number;
    transfers: number;
    transferVolume: number;
  };

  const stats = new Map<string, MonthStat>();
  const countedTransfers = new Set<string>();

  for (const tx of transactions) {
    const month = (tx.date || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;

    let stat = stats.get(month);
    if (!stat) {
      stat = { income: 0, expense: 0, transfers: 0, transferVolume: 0 };
      stats.set(month, stat);
    }

    const value = convert(tx.amount, tx.currency, baseCurrency);
    if (tx.isTransfer) {
      // A transfer between own accounts has two rows with the same transferHash.
      // Count it once; single-sided ATM/BLIK transfers have no hash and count by id.
      const key = tx.transferHash ? `hash:${tx.transferHash}` : `id:${tx.id}`;
      if (countedTransfers.has(key)) continue;
      countedTransfers.add(key);
      stat.transfers += 1;
      stat.transferVolume += Math.abs(value);
      continue;
    }

    if (value > 0) stat.income += value;
    else stat.expense += Math.abs(value);
  }

  const dataMonths = [...stats.keys()].sort();
  let start = dateFrom ? dateFrom.slice(0, 7) : '';
  let end = dateTo ? dateTo.slice(0, 7) : '';

  if (!start && dataMonths.length > 0) start = dataMonths[0]!;
  if (!end && dataMonths.length > 0) end = dataMonths[dataMonths.length - 1]!;
  if (!start || !end) return [];

  let months = enumerateMonths(start, end);
  if (!dateFrom && !dateTo && months.length > maxMonths) {
    months = months.slice(-maxMonths);
  }

  return months.map((month) => {
    const stat = stats.get(month);
    const income = roundCurrency(stat?.income ?? 0, baseCurrency);
    const expense = roundCurrency(stat?.expense ?? 0, baseCurrency);
    return {
      month,
      label: monthLabel(month),
      income,
      expense,
      net: roundCurrency(income - expense, baseCurrency),
      transfers: stat?.transfers ?? 0,
      transferVolume: roundCurrency(stat?.transferVolume ?? 0, baseCurrency),
    };
  });
}

export type AnalyticsGrouping = 'auto' | 'day' | 'week' | 'month' | 'quarter' | 'year';
export type ResolvedGrouping = Exclude<AnalyticsGrouping, 'auto'>;

export interface GroupedAnalyticsPeriod {
  key: string;
  label: string;
  total: number;
  categories: Record<string, number>;
  other: number;
}

export interface GroupedCategoryAnalytics {
  grouping: ResolvedGrouping;
  periods: GroupedAnalyticsPeriod[];
  categories: string[];
  maxPeriodTotal: number;
  maxCell: number;
  grandTotal: number;
  truncated: boolean;
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function startOfGrouping(date: Date, grouping: ResolvedGrouping): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (grouping === 'day') return result;

  if (grouping === 'week') {
    const day = result.getUTCDay();
    const diff = (day + 6) % 7; // Monday as the first day
    result.setUTCDate(result.getUTCDate() - diff);
    return result;
  }

  result.setUTCDate(1);
  if (grouping === 'month') return result;

  if (grouping === 'quarter') {
    result.setUTCMonth(Math.floor(result.getUTCMonth() / 3) * 3);
    return result;
  }

  result.setUTCMonth(0);
  return result;
}

function addGrouping(date: Date, grouping: ResolvedGrouping): Date {
  const result = new Date(date.getTime());
  if (grouping === 'day') result.setUTCDate(result.getUTCDate() + 1);
  else if (grouping === 'week') result.setUTCDate(result.getUTCDate() + 7);
  else if (grouping === 'month') result.setUTCMonth(result.getUTCMonth() + 1);
  else if (grouping === 'quarter') result.setUTCMonth(result.getUTCMonth() + 3);
  else result.setUTCFullYear(result.getUTCFullYear() + 1);
  return result;
}

function groupingLabelText(date: Date, grouping: ResolvedGrouping): string {
  const year = String(date.getUTCFullYear()).slice(2);
  const month = date.getUTCMonth();
  const day = String(date.getUTCDate()).padStart(2, '0');
  if (grouping === 'day' || grouping === 'week') {
    return `${day}.${String(month + 1).padStart(2, '0')}`;
  }
  if (grouping === 'month') return `${MONTH_LABELS[month]} ${year}`;
  if (grouping === 'quarter') return `Q${Math.floor(month / 3) + 1} ${year}`;
  return String(date.getUTCFullYear());
}

function resolveGrouping(
  grouping: AnalyticsGrouping,
  start: Date | null,
  end: Date | null,
): ResolvedGrouping {
  if (grouping !== 'auto') return grouping;
  if (!start || !end) return 'month';

  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days <= 45) return 'day';
  if (days <= 180) return 'week';
  if (days <= 3650) return 'month';
  if (days <= 7300) return 'quarter';
  return 'year';
}

/**
 * Expense categories over time. Amounts are expenses only (negative,
 * non-transfer), converted to `baseCurrency`; refunds are not netted here.
 */
export function buildGroupedCategoryAnalytics(
  transactions: EnrichedTransaction[],
  baseCurrency: Currency,
  dateFrom: string,
  dateTo: string,
  groupingInput: AnalyticsGrouping,
  convert: (amount: number, from: Currency, to: Currency) => number,
  topCategoryLimit = 10,
  maxPeriods = 200,
): GroupedCategoryAnalytics {
  const fromDate = parseDateOnly(dateFrom);
  const toDate = parseDateOnly(dateTo);

  const expenses = transactions.filter((tx) => {
    if (tx.isTransfer || tx.amount >= 0) return false;
    const category = tx.categoryName || '';
    // Negative income rows are reversals, not expenses; clearing is reconciliation.
    if (category.startsWith('Income')) return false;
    if (category.startsWith('Other:Clearing')) return false;
    return parseDateOnly(tx.date) !== null;
  });

  const dates = expenses
    .map((tx) => parseDateOnly(tx.date)!)
    .sort((a, b) => a.getTime() - b.getTime());

  const start = fromDate || dates[0] || null;
  const end = toDate || dates[dates.length - 1] || null;
  const grouping = resolveGrouping(groupingInput, start, end);

  if (!start || !end) {
    return {
      grouping,
      periods: [],
      categories: [],
      maxPeriodTotal: 1,
      maxCell: 1,
      grandTotal: 0,
      truncated: false,
    };
  }

  const startKey = startOfGrouping(start, grouping);
  const endKey = startOfGrouping(end, grouping);
  const fromBoundary = dateFrom ? dateFrom.slice(0, 10) : null;
  const toBoundary = dateTo ? dateTo.slice(0, 10) : null;

  const totals = new Map<string, number>();
  const periodMap = new Map<string, { total: number; categories: Map<string, number> }>();

  for (const tx of expenses) {
    const date = tx.date.slice(0, 10);
    if (fromBoundary && date < fromBoundary) continue;
    if (toBoundary && date > toBoundary) continue;

    const category = isUncategorizedCategory(tx.categoryName)
      ? '(Bez kategorii)'
      : (tx.categoryName || '(Bez kategorii)');
    const value = Math.abs(convert(tx.amount, tx.currency, baseCurrency));
    if (value <= 0) continue;

    const key = formatDateOnly(startOfGrouping(parseDateOnly(date)!, grouping));
    let period = periodMap.get(key);
    if (!period) {
      period = { total: 0, categories: new Map() };
      periodMap.set(key, period);
    }
    period.total += value;
    period.categories.set(category, (period.categories.get(category) || 0) + value);
    totals.set(category, (totals.get(category) || 0) + value);
  }

  const categories = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topCategoryLimit)
    .map(([category]) => category);

  const periodKeys: Date[] = [];
  let cursor = new Date(startKey.getTime());
  while (cursor.getTime() <= endKey.getTime() && periodKeys.length <= maxPeriods) {
    periodKeys.push(new Date(cursor.getTime()));
    cursor = addGrouping(cursor, grouping);
  }

  let truncated = false;
  if (periodKeys.length > maxPeriods) {
    periodKeys.splice(0, periodKeys.length - maxPeriods);
    truncated = true;
  }

  let maxPeriodTotal = 1;
  let maxCell = 1;
  let grandTotal = 0;

  const periods: GroupedAnalyticsPeriod[] = periodKeys.map((date) => {
    const key = formatDateOnly(date);
    const source = periodMap.get(key);
    const total = roundCurrency(source?.total ?? 0, baseCurrency);

    const categoryValues: Record<string, number> = {};
    let topSum = 0;
    for (const category of categories) {
      const value = roundCurrency(source?.categories.get(category) ?? 0, baseCurrency);
      categoryValues[category] = value;
      topSum += value;
    }

    const other = roundCurrency(Math.max(0, total - topSum), baseCurrency);
    maxPeriodTotal = Math.max(maxPeriodTotal, total);
    maxCell = Math.max(maxCell, other, ...Object.values(categoryValues));
    grandTotal += total;

    return {
      key,
      label: groupingLabelText(date, grouping),
      total,
      categories: categoryValues,
      other,
    };
  });

  return {
    grouping,
    periods,
    categories,
    maxPeriodTotal,
    maxCell,
    grandTotal: roundCurrency(grandTotal, baseCurrency),
    truncated,
  };
}

export interface CashflowAnalyticsPeriod {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface CashflowAnalytics {
  grouping: ResolvedGrouping;
  periods: CashflowAnalyticsPeriod[];
  maxValue: number;
  totalIncome: number;
  totalExpense: number;
  truncated: boolean;
}

/**
 * Simple income/expense series for the analytics tab. Transfers and clearing
 * are excluded; negative income rows reduce income instead of becoming expenses.
 */
export function buildCashflowAnalytics(
  transactions: EnrichedTransaction[],
  baseCurrency: Currency,
  dateFrom: string,
  dateTo: string,
  groupingInput: AnalyticsGrouping,
  convert: (amount: number, from: Currency, to: Currency) => number,
  maxPeriods = 240,
): CashflowAnalytics {
  const fromDate = parseDateOnly(dateFrom);
  const toDate = parseDateOnly(dateTo);

  const rows = transactions.filter((tx) => !tx.isTransfer && parseDateOnly(tx.date) !== null);
  const dates = rows
    .map((tx) => parseDateOnly(tx.date)!)
    .sort((a, b) => a.getTime() - b.getTime());

  const start = fromDate || dates[0] || null;
  const end = toDate || dates[dates.length - 1] || null;
  const grouping = resolveGrouping(groupingInput, start, end);

  if (!start || !end) {
    return {
      grouping,
      periods: [],
      maxValue: 1,
      totalIncome: 0,
      totalExpense: 0,
      truncated: false,
    };
  }

  const startKey = startOfGrouping(start, grouping);
  const endKey = startOfGrouping(end, grouping);
  const fromBoundary = dateFrom ? dateFrom.slice(0, 10) : null;
  const toBoundary = dateTo ? dateTo.slice(0, 10) : null;

  const stats = new Map<string, { income: number; expense: number }>();

  for (const tx of rows) {
    const date = tx.date.slice(0, 10);
    if (fromBoundary && date < fromBoundary) continue;
    if (toBoundary && date > toBoundary) continue;

    const category = tx.categoryName || '';
    if (category.startsWith('Other:Clearing')) continue;

    const value = convert(tx.amount, tx.currency, baseCurrency);
    const key = formatDateOnly(startOfGrouping(parseDateOnly(date)!, grouping));
    let stat = stats.get(key);
    if (!stat) {
      stat = { income: 0, expense: 0 };
      stats.set(key, stat);
    }

    if (category.startsWith('Income')) {
      stat.income += value;
    } else if (value > 0) {
      stat.income += value;
    } else {
      stat.expense += Math.abs(value);
    }
  }

  const periodKeys: Date[] = [];
  let cursor = new Date(startKey.getTime());
  while (cursor.getTime() <= endKey.getTime() && periodKeys.length <= maxPeriods) {
    periodKeys.push(new Date(cursor.getTime()));
    cursor = addGrouping(cursor, grouping);
  }

  let truncated = false;
  if (periodKeys.length > maxPeriods) {
    periodKeys.splice(0, periodKeys.length - maxPeriods);
    truncated = true;
  }

  let totalIncome = 0;
  let totalExpense = 0;

  const periods: CashflowAnalyticsPeriod[] = periodKeys.map((date) => {
    const key = formatDateOnly(date);
    const stat = stats.get(key);
    const income = roundCurrency(stat?.income ?? 0, baseCurrency);
    const expense = roundCurrency(stat?.expense ?? 0, baseCurrency);
    totalIncome += income;
    totalExpense += expense;
    return {
      key,
      label: groupingLabelText(date, grouping),
      income,
      expense,
      net: roundCurrency(income - expense, baseCurrency),
    };
  });

  return {
    grouping,
    periods,
    maxValue: Math.max(1, ...periods.map((period) => Math.max(period.income, period.expense))),
    totalIncome: roundCurrency(totalIncome, baseCurrency),
    totalExpense: roundCurrency(totalExpense, baseCurrency),
    truncated,
  };
}
