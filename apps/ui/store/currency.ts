export type FiatCurrency =
  | 'PLN'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'PHP'
  | 'SGD'
  | 'JPY'
  | 'MYR'
  | 'THB'
  | 'TND'
  | 'TWD'
  | 'GEL';

export type CryptoCurrency = 'BTC' | 'ETH' | 'SOL' | 'DOGE';

export type Currency = FiatCurrency | CryptoCurrency;

export const fiatCurrencies: FiatCurrency[] = [
  'PLN',
  'USD',
  'EUR',
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

export const cryptoCurrencies: CryptoCurrency[] = ['BTC', 'ETH', 'SOL', 'DOGE'];

export const currencies: Currency[] = [...fiatCurrencies, ...cryptoCurrencies];

export function getCurrencyDigits(currency: Currency): 2 | 8 {
  return (cryptoCurrencies as Currency[]).includes(currency) ? 8 : 2;
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
