import { getCurrencyDigits, type Currency } from '~/store/currency';

export function formatAmount(num: number = 0, currency?: Currency): string {
  const digits = getCurrencyDigits(currency || 'USD');

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: true,
  })
    .format(num)
    .replace(/,/g, ' ');
}
