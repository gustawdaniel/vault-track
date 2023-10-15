export type Currency =
  | 'PLN'
  | 'USD'
  | 'EUR'
  | 'BTC'
  | 'GBP'
  | 'PHP'
  | 'SGD'
  | 'JPY'
  | 'MYR'
  | 'THB'
  | 'TND'
  | 'TWD'
  | 'GEL';
export const currencies: Currency[] = [
  'PLN',
  'USD',
  'EUR',
  'BTC',
  'GBP',
  'PHP',
  'SGD',
  'JPY',
  'MYR',
  'THB',
  'TND',
  'TWD',
  'GEL',
];

export function getCurrencyDigits(currency: Currency): 2 | 8 {
  return currency === 'BTC' ? 8 : 2;
}

export function sum(a: number, b: number, currency: Currency) {
  const digits = getCurrencyDigits(currency);
  const scale = Math.pow(10, digits);
  return Math.round(a * scale + b * scale) / scale;
}

export function sumArray(arr: number[], currency: Currency) {
  const digits = getCurrencyDigits(currency);
  const scale = Math.pow(10, digits);
  return Math.round(arr.reduce((sum, next) => sum + next * scale, 0)) / scale;
}

export function getCurrency(input: string | undefined): Currency {
  if (!input || !currencies.includes(input as Currency)) return 'USD';
  return input as Currency;
}
