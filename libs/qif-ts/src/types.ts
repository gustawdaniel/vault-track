/**
 * Represents an entire QIF file's data.
 *
 * @public
 */
export type QifData = {
  type: QifType;
  accounts?: QifAccount[];
  transactions: QifTransaction[];
};

/**
 * Enum of all possible QIF file types for a QIF file.
 *
 * @public
 */
export enum QifType {
  Cash = '!Type:Cash',
  Bank = '!Type:Bank',
  Card = '!Type:CCard',
  Investment = '!Type:Invst',
  Asset = '!Type:Oth A',
  Liability = '!Type:Oth L',
  Invoice = '!Type:Invoice',
  Account = '!Account',
  Category = '!Type:Cat',
  Class = '!Type:Class',
  Memorized = '!Type:Memorized',
}

export type QifAccountType = 'Cash' | 'Bank' | 'Card';

export type QifAccount = {
  name: string; // N
  type: QifAccountType; // T
  currency?: string; // C
  description?: string; // D
  order?: number; // O
  hidden?: boolean; // H
};

/**
 * Represents a single item from a Qif file, with all associated item fields.
 *
 * @public
 */
export type QifTransaction = {
  date?: string; // D
  amount?: number; // T
  clearedStatus?: string; // C
  reference?: string; // N
  payee?: string; // P
  memo?: string; // M
  address?: string[]; // A
  category?: string; // L
  account?: string; // only for multi accounts
  splits?: QifSplit[];
  order?: number;

  investmentAction?: string; // N
  investmentSecurity?: string; // Y
  investmentPrice?: number; // I
  investmentQuantity?: number; // Q
  investmentReminder?: string; // P
  investmentComission?: number; // O
  investmentAccount?: string; // L
  investmentAmountTransferred?: number; // $
};

/**
 * Represents a split of a transaction.
 *
 * @public
 */
export type QifSplit = {
  category?: string; // S
  memo?: string; // E
  amount?: number; // $
  percent?: number; // %
};

export const QIF_TYPE_STRINGS_MAP: Record<string, QifType> = {
  '!Type:Cash': QifType.Cash,
  '!Type:Bank': QifType.Bank,
  '!Type:CCard': QifType.Card,
  '!Type:Invst': QifType.Investment,
  '!Type:Oth A': QifType.Asset,
  '!Type:Oth L': QifType.Liability,
  '!Account': QifType.Account,
  '!Type:Cat': QifType.Category,
  '!Type:Class': QifType.Class,
  '!Type:Memorized': QifType.Memorized,
};

/* tslint:disable:max-classes-per-file */
export class QifMapperError extends Error {}

export class QifParserError extends Error {}

/* tslint:enable:max-classes-per-file */
