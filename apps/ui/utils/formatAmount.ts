export function formatAmount(num: number = 0): string {
  const [int, fra] = num.toString().split('.');
  return Number(int).toLocaleString() + '.' + (fra ?? '').padEnd(2, '0');
}
