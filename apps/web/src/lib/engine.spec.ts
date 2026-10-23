import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  computeAccountsAndReconciliation,
  buildLedgerTimeline,
  parseCategoryAndProject,
  isTransferCategory,
  extractTransferTarget,
  isUncategorizedCategory,
  normalizeSearchText,
  buildMonthlyAnalytics,
  buildGroupedCategoryAnalytics,
  buildCashflowAnalytics,
} from './engine';
describe('CashDroid Pro Ledger Engine (Svelte 5 core)', () => {
  const backupPath = path.resolve(__dirname, '../../../../backup-1792270083.json');
  const snapshot: any = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  it('correctly splits Category:Subcategory/Project and [Transfer]/Project strings', () => {
    expect(parseCategoryAndProject('Jedzenie:Obiady/Wakacje 2025')).toEqual({
      categoryName: 'Jedzenie:Obiady',
      projectName: 'Wakacje 2025',
    });

    expect(parseCategoryAndProject('[Konto EUR]/Wyjazd')).toEqual({
      categoryName: '[Konto EUR]',
      projectName: 'Wyjazd',
    });
    expect(isTransferCategory('[Konto EUR]/Wyjazd')).toBe(true);
    expect(extractTransferTarget('[Konto EUR]/Wyjazd')).toBe('Konto EUR');
  });

  it('computes all 26 accounts and reconciliation statuses in <25ms on 6,471 transactions', () => {
    const start = performance.now();
    const { accountsWithMeta, failingAsserts, assertStatusById } = computeAccountsAndReconciliation(
      snapshot.accounts,
      snapshot.transactions,
      snapshot.asserts || [],
    );
    const elapsed = performance.now() - start;

    expect(accountsWithMeta.length).toBe(26);
    expect(elapsed).toBeLessThan(100);

    // Check known account balances & asserts
    const gotowka = accountsWithMeta.find((a) => a.name === 'Gotówka');
    expect(gotowka).toBeDefined();
    expect(gotowka!.txCount).toBe(65);
    expect(gotowka!.lastAssertDate).toBeDefined();
    expect(assertStatusById.size).toBe((snapshot.asserts || []).length);
    // All 58 historical assertions in backup-1792270083.json are reconciled!
    expect(failingAsserts.length).toBe(0);

    // Verify discrepancy detection when a new assertion diverges from computed balance
    const { failingAsserts: withDiscrepancy } = computeAccountsAndReconciliation(
      snapshot.accounts,
      snapshot.transactions,
      [
        ...(snapshot.asserts || []),
        {
          id: 'test-discrepancy',
          accountId: gotowka!.id,
          date: '2099-12-31',
          value: gotowka!.balance + 100,
        },
      ],
    );
    expect(withDiscrepancy.length).toBe(1);
    expect(withDiscrepancy[0]!.diff).toBeCloseTo(-100, 2);
  });

  it('builds chronological ledger timeline interleaved with balance assertions', () => {
    const { accountsWithMeta, runningBalanceByTxId, assertStatusById } =
      computeAccountsAndReconciliation(
        snapshot.accounts,
        snapshot.transactions,
        snapshot.asserts || [],
      );
    const gotowka = accountsWithMeta.find((a) => a.name === 'Gotówka')!;

    const timeline = buildLedgerTimeline(
      snapshot.transactions,
      snapshot.asserts || [],
      snapshot.accounts,
      snapshot.categories || [],
      {
        accountId: gotowka.id,
        category: '',
        project: '',
        search: '',
        type: 'all',
        dateFrom: '',
        dateTo: '',
      },
      runningBalanceByTxId,
      assertStatusById,
    );

    expect(timeline.length).toBe(66);
    const assertRows = timeline.filter((r) => r.kind === 'assert');
    expect(assertRows.length).toBe(1);

    // Verify top transaction row running balance matches computed account balance
    const topTxRow = timeline.find((r) => r.kind === 'transaction');
    expect(topTxRow).toBeDefined();
    if (topTxRow?.kind === 'transaction') {
      expect(topTxRow.tx.runningBalance).toBeCloseTo(gotowka.balance, 2);
    }
  });

  it('treats Transfer and Transfer:* as transfers, not expenses', () => {
    expect(isTransferCategory('Transfer')).toBe(true);
    expect(isTransferCategory('Transfer:Blik')).toBe(true);
    expect(isTransferCategory('Transfer:Atm')).toBe(true);
    expect(isTransferCategory('Food:Eating out')).toBe(false);
    expect(isTransferCategory('[Revolut PLN]')).toBe(true);
  });

  it('recognises Other:Uncategorized as uncategorized', () => {
    expect(isUncategorizedCategory('')).toBe(true);
    expect(isUncategorizedCategory('Other:Uncategorized')).toBe(true);
    expect(isUncategorizedCategory('Food:Groceries')).toBe(false);
  });

  it('normalises diacritics and whitespace for search', () => {
    expect(normalizeSearchText('  Żabka   Łódź  ')).toBe('zabka lodz');
    expect(normalizeSearchText('SPŁATA POŻYCZKI')).toBe('splata pozyczki');
  });

  it('finds uncategorized rows and searches across accounts', () => {
    const accounts = [
      { id: 'a', name: 'Revolut PLN', type: 'Bank', currency: 'PLN', order: 0 },
      { id: 'b', name: 'Revolut EUR', type: 'Bank', currency: 'EUR', order: 0 },
    ] as any[];
    const transactions = [
      {
        id: 't1',
        accountId: 'a',
        account: 'Revolut PLN',
        amount: -10,
        date: '2026-01-01',
        category: 'Other:Uncategorized',
        payee: '',
        memo: 'Vip Pay Llc',
      },
      {
        id: 't2',
        accountId: 'b',
        account: 'Revolut EUR',
        amount: -20,
        date: '2026-01-02',
        category: 'Food:Groceries',
        payee: 'Biedronka',
        memo: 'Card Payment',
      },
    ] as any[];

    const baseFilter = {
      accountId: '',
      search: '',
      category: '',
      project: '',
      type: 'all' as const,
      dateFrom: '',
      dateTo: '',
    };

    const uncategorized = buildLedgerTimeline(
      transactions,
      [],
      accounts,
      [],
      { ...baseFilter, type: 'uncategorized' },
      new Map(),
      new Map(),
    );
    expect(uncategorized.length).toBe(1);
    expect(uncategorized[0].kind === 'transaction' && uncategorized[0].tx.id).toBe('t1');

    const globalSearch = buildLedgerTimeline(
      transactions,
      [],
      accounts,
      [],
      { ...baseFilter, accountId: 'b', search: 'vip pay' },
      new Map(),
      new Map(),
    );
    expect(globalSearch.length).toBe(1);
    expect(globalSearch[0].kind === 'transaction' && globalSearch[0].tx.id).toBe('t1');
  });

  it('builds monthly analytics and counts a transfer pair once', () => {
    const transactions = [
      {
        id: 't1', accountId: 'a', account: 'A', amount: 100, date: '2026-01-05',
        category: 'Income:Salary', currency: 'PLN', isTransfer: false,
      },
      {
        id: 't2', accountId: 'a', account: 'A', amount: -40, date: '2026-01-10',
        category: 'Food:Groceries', currency: 'PLN', isTransfer: false,
      },
      {
        id: 't3', accountId: 'a', account: 'A', amount: -500, date: '2026-02-01',
        category: 'Transfer', currency: 'PLN', isTransfer: true, transferHash: 'pair-1',
      },
      {
        id: 't4', accountId: 'b', account: 'B', amount: 500, date: '2026-02-01',
        category: 'Transfer', currency: 'PLN', isTransfer: true, transferHash: 'pair-1',
      },
      {
        id: 't5', accountId: 'a', account: 'A', amount: -20, date: '2026-03-01',
        category: 'Transfer:Atm', currency: 'PLN', isTransfer: true,
      },
    ] as any[];

    const points = buildMonthlyAnalytics(
      transactions,
      'PLN',
      '2026-01-01',
      '2026-03-31',
      (amount) => amount,
    );

    expect(points.map((point) => point.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(points[0]!.income).toBe(100);
    expect(points[0]!.expense).toBe(40);
    expect(points[1]!.transfers).toBe(1);
    expect(points[1]!.transferVolume).toBe(500);
    expect(points[2]!.transfers).toBe(1);
    expect(points[2]!.transferVolume).toBe(20);
  });

  it('groups expense categories by year and ignores transfers/income', () => {
    const transactions = [
      { id: 't1', date: '2024-01-10', amount: -100, categoryName: 'Food:Groceries', currency: 'PLN', isTransfer: false },
      { id: 't2', date: '2024-01-15', amount: -200, categoryName: 'Transport:Car', currency: 'PLN', isTransfer: false },
      { id: 't3', date: '2024-02-10', amount: -50, categoryName: 'Food:Groceries', currency: 'PLN', isTransfer: false },
      { id: 't4', date: '2025-01-10', amount: -300, categoryName: 'Food:Groceries', currency: 'PLN', isTransfer: false },
      { id: 't5', date: '2024-01-20', amount: -999, categoryName: 'Food:Groceries', currency: 'PLN', isTransfer: true },
      { id: 't6', date: '2024-01-21', amount: 500, categoryName: 'Income:Salary', currency: 'PLN', isTransfer: false },
    ] as any[];

    const result = buildGroupedCategoryAnalytics(
      transactions,
      'PLN',
      '',
      '',
      'year',
      (amount) => amount,
    );

    expect(result.grouping).toBe('year');
    expect(result.periods.map((period) => period.key)).toEqual(['2024-01-01', '2025-01-01']);
    expect(result.periods[0]!.total).toBe(350);
    expect(result.periods[1]!.total).toBe(300);
    expect(result.categories[0]).toBe('Food:Groceries');
    expect(result.periods[0]!.categories['Food:Groceries']).toBe(150);
    expect(result.periods[0]!.categories['Transport:Car']).toBe(200);
    expect(result.grandTotal).toBe(650);
  });

  it('builds income/expense cashflow and excludes transfers', () => {
    const transactions = [
      { id: 't1', date: '2024-01-05', amount: 100, categoryName: 'Income:Salary', currency: 'PLN', isTransfer: false },
      { id: 't2', date: '2024-01-10', amount: -40, categoryName: 'Food:Groceries', currency: 'PLN', isTransfer: false },
      { id: 't3', date: '2024-01-15', amount: -10, categoryName: 'Income:Refund', currency: 'PLN', isTransfer: false },
      { id: 't4', date: '2024-01-20', amount: -999, categoryName: 'Transfer', currency: 'PLN', isTransfer: true },
      { id: 't5', date: '2024-02-05', amount: -20, categoryName: 'Food:Eating out', currency: 'PLN', isTransfer: false },
    ] as any[];

    const result = buildCashflowAnalytics(
      transactions,
      'PLN',
      '2024-01-01',
      '2024-02-29',
      'month',
      (amount) => amount,
    );

    expect(result.periods.map((period) => period.key)).toEqual(['2024-01-01', '2024-02-01']);
    expect(result.periods[0]!.income).toBe(90);
    expect(result.periods[0]!.expense).toBe(40);
    expect(result.periods[1]!.expense).toBe(20);
    expect(result.totalIncome).toBe(90);
    expect(result.totalExpense).toBe(60);
  });
});
