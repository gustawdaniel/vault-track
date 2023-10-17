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

export function getClearedStatusName(type: ClearedStatus): ClearedStatusName {
  const found = clearedStatusMap.get(type);
  return found ?? 'Unreconciled';
}

export function getClearedStatusFromString(
  input: string | undefined,
): ClearedStatus {
  switch (input) {
    case '*':
      return '*';
    case 'X':
      return 'X';
    case '?':
      return '?';
    default:
      return '';
  }
}
