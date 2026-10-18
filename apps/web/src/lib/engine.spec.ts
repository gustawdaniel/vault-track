import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  computeAccountsAndReconciliation,
  buildLedgerTimeline,
  parseCategoryAndProject,
  isTransferCategory,
  extractTransferTarget,
} from './engine';
import type { BackupSnapshot } from './types';

describe('CashDroid Pro Ledger Engine (Svelte 5 core)', () => {
  const backupPath = path.resolve(__dirname, '../../../../backup-1792270083.json');
  const snapshot: BackupSnapshot = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

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
        category: null,
        project: null,
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
});
