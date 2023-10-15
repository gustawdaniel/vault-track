export type ClearedStatus = '' | '*' | 'X' | '?';
export type ClearedStatusName =
  | 'Unreconciled'
  | 'Cleared'
  | 'Reconciled'
  | 'Void';

export const clearedStatusMap = new Map<ClearedStatus, ClearedStatusName>([
  ['', 'Unreconciled'],
  ['*', 'Cleared'],
  ['X', 'Reconciled'],
  ['?', 'Void'],
]);
