import { uid } from 'uid';
import type { Account, AppEvent, EnrichedTransaction, TimelineItem, Transaction } from './types';

// Same encoding as the Vue app (apps/ui/utils/splitIdParams.ts), so split groups
// created in either client stay compatible: "<group payee>###<uuid>".
const SEPARATOR = '###';

export interface SplitLine {
  id: string;
  amount: number; // absolute value; splits are stored as expenses
  payee: string;
  category: string;
  memo: string;
}

export function encodeSplitId(payee: string, id?: string): string {
  const cleanId = id || uid();
  return payee ? `${payee}${SEPARATOR}${cleanId}` : cleanId;
}

export function decodeSplitId(splitId: string | undefined): { id: string; payee: string | undefined } {
  if (!splitId) return { id: uid(), payee: undefined };
  const parts = splitId.split(SEPARATOR);
  if (parts.length > 1) {
    const id = parts.pop()!;
    return { id, payee: parts.join(SEPARATOR) };
  }
  return { id: splitId, payee: undefined };
}

export function splitRemaining(total: number, lines: SplitLine[]): number {
  const sum = lines.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
  return Math.round((Math.abs(Number(total) || 0) - sum) * 100) / 100;
}

export function isSplitValid(total: number, lines: SplitLine[]): boolean {
  return (
    lines.length > 0 &&
    Math.abs(splitRemaining(total, lines)) < 0.01 &&
    lines.every((l) => Number(l.amount) > 0)
  );
}

function composeCategory(category: string, project: string): string | undefined {
  const cat = category.trim();
  const proj = project.trim();
  if (!cat && !proj) return undefined;
  return proj ? `${cat}/${proj}` : cat;
}

/**
 * Events that turn the given lines into one split group on `account`.
 * Lines whose id already exists are updated (keeping fields such as externalId),
 * and members of the previous group that are no longer listed are deleted.
 */
export function buildSplitEvents(params: {
  transactions: Record<string, Transaction>;
  account: Account;
  lines: SplitLine[];
  groupPayee: string;
  project: string;
  memo: string;
  date: string;
  existingSplitId?: string | null;
  previousIds?: string[];
  round: (amount: number) => number;
}): Array<{ type: AppEvent['type']; payload: any }> {
  const { transactions, account, lines, groupPayee, project, memo, date, round } = params;
  const existingUuid = params.existingSplitId ? decodeSplitId(params.existingSplitId).id : undefined;
  const splitId = encodeSplitId(groupPayee.trim(), existingUuid);

  const events: Array<{ type: AppEvent['type']; payload: any }> = [];
  const keptIds = new Set<string>();

  for (const line of lines) {
    const id = line.id || uid(11);
    keptIds.add(id);
    const previous = transactions[id];
    const tx: Transaction = {
      ...(previous ?? {}),
      id,
      account: account.name,
      accountId: account.id,
      amount: round(-Math.abs(Number(line.amount) || 0)),
      date,
      payee: line.payee.trim() || groupPayee.trim() || undefined,
      category: composeCategory(line.category, project),
      memo: line.memo.trim() || memo.trim() || undefined,
      splitId,
    };
    events.push({ type: previous ? 'TRANSACTION_UPDATED' : 'TRANSACTION_ADDED', payload: tx });
  }

  for (const id of params.previousIds ?? []) {
    if (!keptIds.has(id) && transactions[id]) {
      events.push({ type: 'TRANSACTION_DELETED', payload: { id } });
    }
  }

  return events;
}

export interface SplitLedgerRow {
  kind: 'split';
  date: string;
  sortKey: string;
  splitId: string;
  /** Newest visible member: carries account, currency and the balance after the group. */
  tx: EnrichedTransaction;
  members: EnrichedTransaction[];
  amount: number;
  payee: string;
  categories: string[];
  /** Members in the whole group, which can exceed members.length when a filter hides some. */
  totalCount: number;
}

/**
 * Collapse split members into one ledger row placed where the first (newest)
 * member appears, as Cash Droid shows a split as a single transaction.
 * Expects the newest-first order of buildLedgerTimeline.
 */
export function groupSplitRows(
  items: TimelineItem[],
  groupSizes: Map<string, number>
): Array<TimelineItem | SplitLedgerRow> {
  const groups = new Map<string, SplitLedgerRow>();
  const out: Array<TimelineItem | SplitLedgerRow> = [];

  for (const item of items) {
    if (item.kind !== 'transaction' || !item.tx.splitId) {
      out.push(item);
      continue;
    }
    const tx = item.tx;
    const key = `${tx.accountId}|${tx.splitId}`;
    let row = groups.get(key);
    if (!row) {
      row = {
        kind: 'split',
        date: item.date,
        sortKey: item.sortKey,
        splitId: tx.splitId!,
        tx,
        members: [],
        amount: 0,
        payee: decodeSplitId(tx.splitId).payee || tx.payee || '',
        categories: [],
        totalCount: groupSizes.get(tx.splitId!) ?? 0,
      };
      groups.set(key, row);
      out.push(row);
    }
    row.members.push(tx);
    row.amount += tx.amount;
    const label = tx.isTransfer ? `⇄ ${tx.transferTarget ?? ''}` : tx.categoryName;
    if (label && !row.categories.includes(label)) row.categories.push(label);
  }

  for (const row of groups.values()) {
    row.amount = Math.round(row.amount * 1e8) / 1e8;
    row.totalCount = Math.max(row.totalCount, row.members.length);
  }
  return out;
}
