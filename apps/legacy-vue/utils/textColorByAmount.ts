export function textColorByAmount(amount: number): string {
  if (amount < 0) return 'text-red-700';
  if (amount > 0) return 'text-green-700';
  return '';
}
