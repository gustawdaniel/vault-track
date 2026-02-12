import {
  QIF_TYPE_STRINGS_MAP,
  type QifAccount,
  type QifAccountType,
  type QifData,
  QifParserError,
  type QifSplit,
  type QifTransaction,
  QifType,
} from './types';

/**
 * Deserializes a valid QIF formatted string.
 *
 * @param data - The string to be deserialized
 * @returns A QifData object describing the data in the input
 *
 * @public
 */
export function deserializeQif(data: string): QifData {
  const dataLines: string[] = data
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');

  if (dataLines.length === 0) {
    throw new QifParserError('No valid QIF content found.');
  }

  const type: QifType = QIF_TYPE_STRINGS_MAP[dataLines[0]];

  dataLines.shift();

  switch (type) {
    case QifType.Account:
      return parseMultiAccount(dataLines);
    case QifType.Investment:
      return parseInvestmentFile(dataLines);
    case QifType.Bank:
    case QifType.Cash:
    case QifType.Card:
    case QifType.Liability:
    case QifType.Asset:
      return parseNonInvestmentFile(dataLines, type);
    default:
      throw new QifParserError('Qif File Type not supported: ' + type);
  }
}

function appendEntity(
  qifData: QifData,
  type: QifType,
  entity: QifAccount | QifTransaction,
  currentBankName: string,
) {
  // console.log(entity, type, type === QifType.Account);

  if (type === QifType.Account) {
    const account = entity as QifAccount;

    if (qifData.accounts?.find((a) => a.name === account.name)) return qifData;

    qifData.accounts?.push(account);
  } else {
    const transaction = entity as QifTransaction;

    qifData.transactions.push(transaction);
  }

  return qifData;
}

function parseMultiAccount(dataLines: string[]): QifData {
  const defaultAccount = (): QifAccount => ({ name: '', type: 'Cash' });
  const defaultTransaction = ({
    account,
  }: {
    account: string;
  }): QifTransaction => ({ amount: 0, account });

  const type = {
    list_name: QifType.Account,
  };
  let currentBankName = '';
  let account: QifAccount = defaultAccount();
  let transaction: QifTransaction = defaultTransaction({ account: '' });
  let parsingSplit = false;
  let currentSplit: QifSplit = {};

  let qifData: QifData = {
    accounts: [],
    transactions: [],
    type: QifType.Account,
  };

  for (const line of dataLines) {
    const lineText: QifAccountType | string = line.substring(1);

    // handle Splits
    if (parsingSplit) {
      switch (line[0]) {
        case 'E':
          currentSplit.memo = lineText;
          continue;
        case '$':
          currentSplit.amount = parseFloat(lineText);
          continue;
        case '%':
          currentSplit.percent = parseFloat(lineText);
          continue;
        case 'S':
          transaction.splits = transaction.splits || [];
          transaction.splits.push(currentSplit);
          currentSplit = {};
          currentSplit.category = lineText;
          continue;
      }

      if (Object.keys(currentSplit).length > 0) {
        transaction.splits = transaction.splits || [];
        transaction.splits.push(currentSplit);
        currentSplit = {};
      }
      parsingSplit = false;
    }

    switch (line[0]) {
      case '!':
        if (line === QifType.Account) {
          type.list_name = QifType.Account;
          account = defaultAccount();
        } else {
          type.list_name = line as QifType;
          transaction = defaultTransaction({ account: currentBankName });
        }
        break;
      case 'D':
        if (type.list_name === QifType.Account) {
          account.description = lineText;
        } else {
          transaction.date = lineText;
        }
        break;
      case 'O':
        account.order = parseInt(lineText);
        break;
      case 'H':
        account.hidden = lineText === 'true';
        break;
      case 'C':
        if (type.list_name === QifType.Account) {
          account.currency = lineText;
        } else {
          transaction.clearedStatus = lineText;
        }
        break;
      case 'M':
        transaction.memo = lineText;
        break;
      case 'A':
        transaction.address = transaction.address || [];
        transaction.address.push(lineText);
        break;
      case 'L':
        transaction.category = lineText;
        break;
      case 'N':
        if (type.list_name === QifType.Account) account.name = lineText;
        else transaction.reference = lineText;
        break;
      case 'T':
        if (type.list_name === QifType.Account) {
          account.type = lineText as QifAccountType;
        } else {
          transaction.amount = Number.parseFloat(lineText);
        }
        break;
      case 'P':
        transaction.payee = lineText;
        break;
      case 'S': // Split
        parsingSplit = true;
        currentSplit.category = lineText;
        break;
      case '^':
        let entity: QifAccount | QifTransaction;
        if (type.list_name === QifType.Account) {
          currentBankName = account.name;
          entity = account;
        } else {
          entity = transaction;
        }
        qifData = appendEntity(
          qifData,
          type.list_name,
          { ...entity },
          currentBankName,
        );
        transaction = defaultTransaction({ account: currentBankName });
    }
  }
  return qifData;
}

function parseNonInvestmentFile(dataLines: string[], type: QifType): QifData {
  const qifData: QifData = {
    type,
    transactions: [],
  };

  let transaction: QifTransaction = {};
  let parsingSplit = false;
  let currentSplit: QifSplit = {};

  for (const line of dataLines) {
    const lineText = line.substring(1);

    // handle Splits
    if (parsingSplit) {
      switch (line[0]) {
        case 'E':
          currentSplit.memo = lineText;
          continue;
        case '$':
          currentSplit.amount = parseFloat(lineText);
          continue;
        case '%':
          currentSplit.percent = parseFloat(lineText);
          continue;
        case 'S':
          transaction.splits = transaction.splits || [];
          transaction.splits.push(currentSplit);
          currentSplit = {};
          currentSplit.category = lineText;
          continue;
      }

      if (Object.keys(currentSplit).length > 0) {
        transaction.splits = transaction.splits || [];
        transaction.splits.push(currentSplit);
        currentSplit = {};
      }
      parsingSplit = false;
    }

    switch (line[0]) {
      case 'D':
        transaction.date = lineText;
        break;
      case 'T':
        transaction.amount = parseFloat(lineText);
        break;
      case 'C':
        transaction.clearedStatus = lineText;
        break;
      case 'N':
        transaction.reference = lineText;
        break;
      case 'P':
        transaction.payee = lineText;
        break;
      case 'M':
        transaction.memo = lineText;
        break;
      case 'A':
        transaction.address = transaction.address || [];
        transaction.address.push(lineText);
        break;
      case 'L':
        transaction.category = lineText;
      case 'S': // Split
        parsingSplit = true;
        currentSplit.category = lineText;
        break;
      case '^':
        if (Object.keys(transaction).length > 0) {
          qifData.transactions.push(transaction);
          transaction = {};
        }
        break;
      default:
        throw new QifParserError(
          'Did not recognise detail item for line: ' + line,
        );
    }
  }

  return qifData;
}

function parseInvestmentFile(dataLines: string[]): QifData {
  const qifData: QifData = {
    type: QifType.Investment,
    transactions: [],
  };

  let transaction: QifTransaction = {};
  for (const line of dataLines) {
    const lineText = line.substring(1);

    switch (line[0]) {
      case 'D':
        transaction.date = lineText;
        break;
      case 'N':
        transaction.investmentAction = lineText;
        break;
      case 'Y':
        transaction.investmentSecurity = lineText;
        break;
      case 'I':
        transaction.investmentPrice = parseFloat(lineText);
        break;
      case 'Q':
        transaction.investmentQuantity = parseFloat(lineText);
        break;
      case 'T':
        transaction.amount = parseFloat(lineText);
        break;
      case 'C':
        transaction.clearedStatus = lineText;
        break;
      case 'P':
        transaction.investmentReminder = lineText;
        break;
      case 'M':
        transaction.memo = lineText;
        break;
      case 'O':
        transaction.investmentComission = parseFloat(lineText);
        break;
      case 'L':
        transaction.investmentAccount = lineText;
        break;
      case '$':
        transaction.investmentAmountTransferred = parseFloat(lineText);
      case '^':
        if (Object.keys(transaction).length > 0) {
          qifData.transactions.push(transaction);
          transaction = {};
        }
        break;
      default:
        throw new QifParserError(
          'Did not recognise detail item for line: ' + line,
        );
    }
  }

  return qifData;
}
