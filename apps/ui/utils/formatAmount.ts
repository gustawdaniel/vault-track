export function formatAmount(num: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  })
    .format(num)
    .replace(/,/g, ' ');
}
