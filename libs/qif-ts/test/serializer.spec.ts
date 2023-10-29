import { describe, it, expect } from '@jest/globals';
import { serializeQif } from '../src';
import { type QifAccountType, type QifData, QifType } from '../src';

describe('serializeQif()', () => {
  it('should write bank type correctly', () => {
    const object: QifData = {
      type: QifType.Bank,
      transactions: [],
    };

    const output: string = serializeQif(object);

    expect(output).toEqual(QifType.Bank);
  });

  it('should write investment type correctly', () => {
    const object: QifData = {
      type: QifType.Investment,
      transactions: [],
    };

    const output: string = serializeQif(object);

    expect(output).toEqual(QifType.Investment);
  });

  it('should write card type correctly', () => {
    const object: QifData = {
      type: QifType.Card,
      transactions: [],
    };

    const output: string = serializeQif(object);

    expect(output).toEqual(QifType.Card);
  });

  it('should throw an error on unsupported type', () => {
    const object: QifData = {
      type: QifType.Memorized,
      transactions: [],
    };

    expect(() => serializeQif(object)).toThrow(
      'Qif File Type not currently supported: !Type:Memorized',
    );
  });

  describe('investment accounts', () => {
    it('should write single transaction with investment values correctly', () => {
      const object: QifData = {
        type: QifType.Investment,
        transactions: [
          {
            date: '19/07/2020',
            investmentAction: 'Sell',
            investmentSecurity: 'MSFT',
            investmentPrice: 123,
            investmentQuantity: 1,
            amount: 123,
            clearedStatus: 'cleared',
            investmentReminder: 'reminder',
            memo: 'Do androids dream of electric sheep?',
            investmentComission: 10,
            investmentAccount: '[PAYEE]',
            investmentAmountTransferred: 100,
          },
        ],
      };

      const output = serializeQif(object);

      expect(output).toEqual(`!Type:Invst
D19/07/2020
NSell
YMSFT
I123
Q1
T123
Ccleared
Preminder
MDo androids dream of electric sheep?
O10
L[PAYEE]
$100
^`);
    });

    it('should not write out detail items if not given in object', () => {
      const object: QifData = {
        type: QifType.Investment,
        transactions: [
          {
            date: '19/07/2020',
            amount: 12,
          },
        ],
      };

      const output = serializeQif(object);

      expect(output).toEqual(`!Type:Invst
D19/07/2020
T12
^`);
    });
  });

  describe('non investment accounts', () => {
    it('should write a transaction with all the detail items', () => {
      const object: QifData = {
        type: QifType.Card,
        transactions: [
          {
            date: '19/09/2019',
            amount: -15,
            clearedStatus: 'uncleared',
            reference: '12345',
            payee: 'ATM',
            memo: 'Some comment',
            address: ['Glasgow'],
            category: 'Spending',
          },
        ],
      };

      const output = serializeQif(object);

      expect(output).toEqual(
        `!Type:CCard
D19/09/2019
PATM
MSome comment
U-15.00
T-15.00
N12345
AGlasgow
LSpending
^`,
      );
    });

    it('should write single transaction with address correctly', () => {
      const object: QifData = {
        type: QifType.Bank,
        transactions: [
          {
            date: '19/09/2019',
            amount: -15,
            payee: 'ATM',
            address: ['42 Buchanan Road', 'Glasgow'],
          },
        ],
      };

      const output = serializeQif(object);

      expect(output).toEqual(
        `!Type:Bank\nD19/09/2019\nPATM\nU-15.00\nT-15.00\nA42 Buchanan Road\nAGlasgow\n^`,
      );
    });

    it('should write single transaction with splits correctly', () => {
      const object: QifData = {
        type: QifType.Bank,
        transactions: [
          {
            date: '19/09/2019',
            amount: -15,
            payee: 'ATM',
            splits: [
              {
                amount: 10,
                category: 'Groceries',
                memo: 'Grocery Shopping money',
              },
              {
                percent: 33,
                category: 'Clothes',
                memo: 'Gloves',
              },
            ],
          },
        ],
      };

      const output = serializeQif(object);

      expect(output).toEqual(
        `!Type:Bank
D19/09/2019
PATM
U-15.00
T-15.00
SGroceries
EGrocery Shopping money
$10
SClothes
EGloves
%33
^`,
      );
    });
  });

  it('multi account file should be serializable', () => {
    const object: QifData = {
      accounts: [
        { name: 'Alior GBP', type: 'Bank' as QifAccountType },
        { name: 'Alior PLN', type: 'Bank' as QifAccountType },
      ],
      transactions: [
        {
          amount: 750,
          account: 'Alior PLN',
          date: "04/30'16",
          payee: 'Web Page',
          category: 'Income:Invoices',
        },
        {
          amount: -668.28,
          account: 'Alior PLN',
          date: "05/04'16",
          payee: 'Accounting',
          category: 'Company:Accounting',
        },
        {
          amount: 900,
          account: 'Alior GBP',
          date: "04/30'16",
          payee: 'New computer',
          category: 'Company:Devices',
        },
        {
          amount: -855.28,
          account: 'Alior GBP',
          date: "05/04'16",
          payee: 'Coffee',
          category: 'Food:Drink',
        },
      ],
      type: '!Account' as QifType,
    };

    const expectedOut = `!Account
NAlior GBP
TBank
^
NAlior PLN
TBank
^
!Account
NAlior GBP
TBank
^
!Type:Bank
D04/30'16
PNew computer
U900.00
T900.00
LCompany:Devices
^
D05/04'16
PCoffee
U-855.28
T-855.28
LFood:Drink
^
!Account
NAlior PLN
TBank
^
!Type:Bank
D04/30'16
PWeb Page
U750.00
T750.00
LIncome:Invoices
^
D05/04'16
PAccounting
U-668.28
T-668.28
LCompany:Accounting
^`;
    const output = serializeQif(object);

    expect(output).toEqual(
      expectedOut
        .split('\n')
        // .filter((l: string) => l[0] !== 'U')
        // .map(l => l[0] === 'T' && parseFloat(l.substring(1)) ? 'T' + parseFloat(l.substring(1)) : l)
        .join('\n'),
    );
  });
});
