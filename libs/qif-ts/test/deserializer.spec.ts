import { expect } from '@jest/globals';
import { QifData, QifTransaction, QifType } from '../src';
import {deserializeQif} from '../src';

describe('deserializeQif()', () => {
  it('should parse type correctly', () => {
    const qif: string = `!Type:Bank
    ^`;

    const output = deserializeQif(qif);

    expect(output.type).toEqual(QifType.Bank);
    expect(output.transactions).toEqual([]);
  });

  it('should handle empty string', () => {

    const qif: string = ``;

    expect( () => deserializeQif(qif)).toThrow('No valid QIF content found.');

  });

  it('should throw an error on unsupported type', () => {
    const qif: string = `!Type:Memorized
    ^`;

    expect( () => deserializeQif(qif)).toThrow('Qif File Type not supported: !Type:Memorized');

  });

  describe('investment accounts', () => {
    it('should parse all investment fields correctly', () => {
      const qif: string = `!Type:Invst
D18/02/1992
NBuy
YAAPL
I12.35
Q100
T1300
Ccleared
PSell at 100
MBuying Apple Cheap
O65
LabcdeAccount
$1300
^`;

      const output = deserializeQif(qif);

      expect(output.type).toEqual(QifType.Investment);
      expect(output.transactions.length).toEqual(1);

      expect(output.transactions[0].date).toEqual('18/02/1992');
      expect(output.transactions[0].investmentAction).toEqual('Buy');
      expect(output.transactions[0].investmentSecurity).toEqual('AAPL');
      expect(output.transactions[0].investmentPrice).toEqual(12.35);
      expect(output.transactions[0].investmentQuantity).toEqual(100);
      expect(output.transactions[0].amount).toEqual(1300);
      expect(output.transactions[0].clearedStatus).toEqual(
        'cleared'
      );
      expect(output.transactions[0].investmentReminder).toEqual('Sell at 100');
      expect(output.transactions[0].memo).toEqual('Buying Apple Cheap');
      expect(output.transactions[0].investmentComission).toEqual(65);
      expect(output.transactions[0].investmentAccount).toEqual('abcdeAccount');
      expect(output.transactions[0].investmentAmountTransferred).toEqual(1300);
    });

    it('should throw error on bad detail item', () => {
      const qif: string = `!Type:Invst
D18/02/1992
NBuy
YAAPL
XBroken_Detail_Item
$1300
^`;

      expect(() => deserializeQif(qif)).toThrow(
        'Did not recognise detail item for line: XBroken_Detail_Item'
      );
    });
  });

  describe('non investment accounts', () => {

    it('should parse all noninvestment fields correctly', () => {
      const qif: string = `!Type:Bank
D18/02/1992
T100
Ccleared
NA1234
PGordon Coffee
MCoffee for the month
A103
AGordon Street
ALondon
LGroceries
^`;

      const output = deserializeQif(qif);

      expect(output.type).toEqual(QifType.Bank);
      expect(output.transactions.length).toEqual(1);

      expect(output.transactions[0].date).toEqual('18/02/1992');
      expect(output.transactions[0].amount).toEqual(100);
      expect(output.transactions[0].clearedStatus).toEqual('cleared');
      expect(output.transactions[0].reference).toEqual('A1234');
      expect(output.transactions[0].payee).toEqual('Gordon Coffee');
      expect(output.transactions[0].memo).toEqual('Coffee for the month');
      expect(output.transactions[0].address).toEqual(['103', 'Gordon Street', 'London']);
      expect(output.transactions[0].category).toEqual('Groceries');

    });

    it('should throw error on bad detail item', () => {
      const qif: string = `!Type:Bank
D18/02/1992
XBroken_Detail_Item
^`;

      expect(() => deserializeQif(qif)).toThrow(
        'Did not recognise detail item for line: XBroken_Detail_Item'
      );
    });

    it('should parse splits transactions correctly', () => {
      const qif: string = `!Type:Bank
      D12/09/2019
      T350
      PAmazon
      SGroceries
      EFood
      $125
      SMedicine
      EMedical Supplies
      $225
      A123 Amazon Way
      ^`;
      const output: QifData = deserializeQif(qif);

      if (output.transactions[0] !== undefined) {
        const outputTransaction: QifTransaction = output.transactions[0];
        expect(outputTransaction.date).toEqual('12/09/2019');

        expect(outputTransaction.splits).toEqual([
          {
            category: 'Groceries',
            memo: 'Food',
            amount: 125
          },
          {
            category: 'Medicine',
            memo: 'Medical Supplies',
            amount: 225
          }
        ]);
      } else {
        expect(output.transactions.length).toEqual(1);
      }
    });

    it('should support multi account files', () => {
      const qif: string = `!Account
NAlior GBP
TBank
^
NAlior PLN
TBank
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
^`;
        const output: QifData = deserializeQif(qif);

        expect(output.transactions.length).toEqual(4);
        expect(output).toHaveProperty('accounts');
        if("accounts" in output) {
          expect(output.accounts?.length).toEqual(2);
        }
        expect(output.type).toEqual('!Account');
    })
  });
});
