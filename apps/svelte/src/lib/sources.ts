import type { Transaction, TransactionSource } from './types';

/** Where a transaction is known from: its `sources`, or (rows from before them) what its external id tells. */
export function sourcesOf(tx: Transaction): TransactionSource[] {
  if (tx.sources?.length) return tx.sources;
  const id = tx.externalId ?? '';
  if (!id) return [{ kind: 'manual', at: '' }];
  const source = id.split(':').slice(0, id.startsWith('enablebanking:') ? 2 : 1).join(':');
  if (id.startsWith('enablebanking:')) return [{ kind: 'bank-api', source, id, at: '' }];
  if (id.startsWith('scan:')) return [{ kind: 'scan', source, id, at: '' }];
  if (/csv|revolut-pln|mbank|wise|millennium/.test(source)) return [{ kind: 'csv', source, id, at: '' }];
  return [{ kind: 'import', source, id, at: '' }];
}

export const SOURCE_LABEL: Record<TransactionSource['kind'], string> = {
  manual: 'ręcznie',
  'bank-api': 'bank API',
  'bank-web': 'strona banku',
  csv: 'CSV',
  scan: 'skan wyciągu',
  email: 'e-mail',
  import: 'import',
};

/** A new hand-made row: the app is its first source. */
export const manualSource = (): TransactionSource => ({ kind: 'manual', at: new Date().toISOString() });
