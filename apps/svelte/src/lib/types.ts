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
  | 'GEL'
  | 'AUD'
  | 'CAD'
  | 'HUF'
  | 'NZD'
  | 'TRY';

export type CryptoCurrency = 'BTC' | 'ETH' | 'SOL' | 'DOGE';
export type Currency = FiatCurrency | CryptoCurrency;

export const FIAT_CURRENCIES: FiatCurrency[] = [
  'PLN', 'USD', 'EUR', 'GBP', 'GEL', 'THB', 'JPY', 'SGD', 'MYR', 'PHP', 'TND', 'TWD', 'AUD', 'CAD', 'HUF', 'NZD', 'TRY'
];
export const CRYPTO_CURRENCIES: CryptoCurrency[] = ['BTC', 'ETH', 'SOL', 'DOGE'];
export const ALL_CURRENCIES: Currency[] = [...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES];

export type AccountType = 'Cash' | 'Bank' | 'Invst' | 'CCard';
export type ClearedStatus = '' | '*' | 'X' | '?';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  description?: string;
  order?: number;
  hidden?: boolean;
  externalId?: string;
  balance?: number;
  /** the bank's time zone: where its day ends (lib/dates.ts), Europe/Warsaw when not set */
  timezone?: string;
}

export interface Transaction {
  id: string;
  account: string;
  accountId: string;
  amount: number;
  date: string;
  category?: string;
  payee?: string;
  memo?: string;
  clearedStatus?: ClearedStatus;
  splitId?: string;
  transferHash?: string;
  hash?: string;
  externalId?: string;
  rawSource?: Record<string, unknown>;
  /** when it was really paid / ordered (lib/dates.ts) */
  executedAt?: string;
  executedAtPrecision?: 'second' | 'minute' | 'day';
  executedAtSource?: 'bank-web' | 'email' | 'receipt' | 'manual' | 'bank-api' | 'import';
  /** the day the bank booked it; null while it is not booked yet */
  bookingDate?: string | null;
  /** where it is known from (lib/sources.ts); one row can have several, e.g. a receipt and its bank payment */
  sources?: TransactionSource[];
}

export interface TransactionSource {
  kind: 'manual' | 'bank-api' | 'bank-web' | 'csv' | 'scan' | 'email' | 'import';
  source?: string;
  id?: string;
  at: string;
  amount?: number;
  date?: string;
  payee?: string;
  memo?: string;
  category?: string;
  executedAt?: string;
  /** null: the source has not booked it yet */
  bookingDate?: string | null;
  /** everything the source sent about it */
  raw?: Record<string, unknown>;
}

export interface PersistedCategory {
  id: string;
  category: string;
  color: string;
  order: number;
  /** what belongs here, for people and for the categorizer's reviewer */
  description?: string;
  /** payee/memo fragments that always mean this category (lib/categorize.ts) */
  keywords?: string[];
}

export interface PersistedProject {
  id: string;
  project: string;
}

export interface Assert {
  id: string;
  accountId: string;
  date: string;
  value: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppState {
  accounts: Record<string, Account>;
  transactions: Record<string, Transaction>;
  categories: Record<string, PersistedCategory>;
  projects: Record<string, PersistedProject>;
  asserts: Record<string, Assert>;
}

export interface AppEvent {
  eventId: string;
  deviceId: string;
  counter: number;
  timestamp: number;
  type:
    | 'TRANSACTION_ADDED'
    | 'TRANSACTION_UPDATED'
    | 'TRANSACTION_DELETED'
    | 'ACCOUNT_CREATED'
    | 'ACCOUNT_UPDATED'
    | 'ACCOUNT_DELETED'
    | 'ACCOUNT_REORDERED'
    | 'CATEGORY_CREATED'
    | 'CATEGORY_UPDATED'
    | 'CATEGORY_DELETED'
    | 'PROJECT_CREATED'
    | 'PROJECT_UPDATED'
    | 'PROJECT_DELETED'
    | 'ASSERT_CREATED'
    | 'ASSERT_UPDATED'
    | 'ASSERT_DELETED';
  payload: any;
}

export interface FailingAssert {
  id: string;
  accountId: string;
  accountName: string;
  currency: Currency;
  date: string;
  expected: number;
  actual: number;
  diff: number;
}

export interface LedgerFilter {
  accountId: string; // '' for all accounts
  search: string;
  category: string;
  project: string;
  type: 'all' | 'expense' | 'income' | 'transfer' | 'uncategorized';
  dateFrom: string;
  dateTo: string;
}

export interface EnrichedTransaction extends Transaction {
  currency: Currency;
  runningBalance: number;
  categoryName: string;
  projectName: string;
  categoryColor: string;
  isTransfer: boolean;
  transferTarget?: string;
}

export interface EnrichedAssert extends Assert {
  accountName: string;
  currency: Currency;
  actualBalance: number;
  diff: number;
  passed: boolean;
}

export type TimelineItem =
  | { kind: 'transaction'; date: string; sortKey: string; tx: EnrichedTransaction }
  | { kind: 'assert'; date: string; sortKey: string; assertion: EnrichedAssert };
