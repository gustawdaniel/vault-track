import {
  QifAccount,
  QifData,
  QifMapperError,
  QifTransaction,
  QifType,
} from './types';

/**
 * Serializes a valid QIFData object.
 *
 * @param data - The QifData object to be serialised
 * @returns The QIF formatted string
 *
 * @public
 */
export function serializeQif(data: QifData): string {
  const output: string[] = [];

  if (data.type === QifType.Account) {
    output.push(QifType.Account);
    data.accounts?.map((account) => {
      output.push(...accountToString(account));
    });

    data.accounts?.map((account) => {
      const selectedTransactions = data.transactions.filter(
        (transaction) => transaction.account === account.name,
      );

      if (selectedTransactions.length) {
        output.push(QifType.Account);
        output.push(...accountToString(account));

        const transactionMappingFunction = getMappingFunction(
          ('!Type:' + account.type) as QifType,
        );

        output.push('!Type:' + account.type);
        selectedTransactions
          .map((transaction) => transactionMappingFunction(transaction))
          .forEach((t) => {
            output.push(...t);
          });
      }
    });
  } else {
    if (data.type) output.push(data.type);

    const transactionMappingFunction = getMappingFunction(data.type);

    data.transactions
      .map((transaction) => transactionMappingFunction(transaction))
      .forEach((t) => output.push(...t));
  }

  return output.join('\n');
}

function getMappingFunction(
  type: QifType,
): (transaction: QifTransaction) => string[] {
  switch (type) {
    case QifType.Investment:
      return investmentTransactionToString;
    case QifType.Bank:
    case QifType.Cash:
    case QifType.Card:
    case QifType.Liability:
    case QifType.Asset:
      return nonInvestmentTransactionToString;
    default:
      throw new QifMapperError(
        'Qif File Type not currently supported: ' + type,
      );
  }
}

function accountToString(account: QifAccount): string[] {
  const output: string[] = [];

  if (account.name) {
    output.push('N' + account.name);
  }
  if (account.type) {
    output.push('T' + account.type);
  }
  if (account.currency) {
    output.push('C' + account.currency);
  }
  if (account.description) {
    output.push('D' + account.description);
  }
  if (account.order) {
    output.push('O' + account.order);
  }
  if (account.hidden) {
    output.push('H' + account.hidden);
  }

  output.push('^');

  return output;
}

function investmentTransactionToString(transaction: QifTransaction): string[] {
  const output: string[] = [];

  if (transaction.date) {
    output.push('D' + transaction.date);
  }

  if (transaction.investmentAction) {
    output.push('N' + transaction.investmentAction);
  }

  if (transaction.investmentSecurity) {
    output.push('Y' + transaction.investmentSecurity);
  }

  if (transaction.investmentPrice) {
    output.push('I' + transaction.investmentPrice);
  }

  if (transaction.investmentQuantity) {
    output.push('Q' + transaction.investmentQuantity);
  }

  if (Number.isFinite(transaction.amount)) {
    output.push('T' + transaction.amount);
  }

  if (transaction.clearedStatus) {
    output.push('C' + transaction.clearedStatus);
  }

  if (Number.isFinite(transaction.investmentReminder)) {
    output.push('P' + transaction.investmentReminder);
  }

  if (transaction.memo) {
    output.push('M' + transaction.memo);
  }

  if (transaction.investmentComission) {
    output.push('O' + transaction.investmentComission);
  }

  if (transaction.investmentAccount) {
    output.push('L' + transaction.investmentAccount);
  }

  if (transaction.investmentAmountTransferred) {
    output.push('$' + transaction.investmentAmountTransferred);
  }

  output.push('^');

  return output;
}

export function usaDateFormat(date: string): string {
  if (/\d{4}-\d{2}-\d{2}/.test(date)) {
    const YY = date.substring(2, 4);
    const MM = date.substring(5, 7);
    const DD = date.substring(8, 10);
    return `${MM}/${DD}'${YY}`;
  } else {
    return date;
  }
}

function nonInvestmentTransactionToString(
  transaction: QifTransaction,
): string[] {
  const output: string[] = [];

  if (transaction.date) {
    output.push('D' + usaDateFormat(transaction.date));
  }

  if (transaction.payee) {
    output.push('P' + transaction.payee);
  }

  if (transaction.memo) {
    output.push('M' + transaction.memo);
  }

  if (
    typeof transaction.amount === 'number' &&
    Number.isFinite(transaction.amount)
  ) {
    output.push('U' + transaction.amount.toFixed(2));
    output.push('T' + transaction.amount.toFixed(2));
  }

  if (transaction.reference) {
    output.push('N' + transaction.reference);
  }

  if (transaction.address) {
    output.push('A' + transaction.address.join('\nA'));
  }

  if (transaction.category) {
    const category = [transaction.category];
    output.push('L' + category.join(':'));
  }

  if (transaction.splits) {
    for (const split of transaction.splits) {
      if (split.category) {
        output.push('S' + split.category);
      }

      if (split.memo) {
        output.push('E' + split.memo);
      }

      if (typeof split.amount === 'number' && Number.isFinite(split.amount)) {
        output.push('$' + split.amount);
      }

      if (split.percent) {
        output.push('%' + split.percent);
      }
    }
  }

  output.push('^');

  return output;
}
