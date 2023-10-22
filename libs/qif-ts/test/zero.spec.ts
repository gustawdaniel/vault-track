const brokenInput = `!Account
Ntest
TCash
CUSD
^
!Account
Ntest
TCash
CUSD
^
!Type:Cash
D10/22'23
Pzero
^
D10/22'23
Pno zero
U1.00
T1.00
^`;

const fixedOutput = `!Account
Ntest
TCash
CUSD
^
!Account
Ntest
TCash
CUSD
^
!Type:Cash
D10/22'23
Pzero
U0.00
T0.00
^
D10/22'23
Pno zero
U1.00
T1.00
^`;

import { expect } from '@jest/globals';
import { deserializeQif, serializeQif } from '../src';

it('zero is added to output event if not exists in input', () => {
  const data = deserializeQif(brokenInput);
  expect(data).toEqual({
    accounts: [
      {
        currency: 'USD',
        name: 'test',
        type: 'Cash',
      },
    ],
    transactions: [
      {
        account: 'test',
        amount: 0,
        date: "10/22'23",
        payee: 'zero',
      },
      {
        account: 'test',
        amount: 1,
        date: "10/22'23",
        payee: 'no zero',
      },
    ],
    type: '!Account',
  });
  expect(serializeQif(data)).toEqual(fixedOutput);
});
