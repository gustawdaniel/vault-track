import { it, expect } from 'vitest';
import { computeUpdateMapFromContext } from './computeUpdateMapFromContext';

it('computeUpdateMapFromContext', () => {
  const updates = computeUpdateMapFromContext(
    `e0c53f3d6d8`,
    {
      payee: 'trx',
      date: '2023-10-19T00:00:00',
      type: 'transfer',
      absoluteAmount: 2000,
      accountId: '079e4868898',
      clearedStatus: '',
      fromAbsoluteAmount: 2000,
      fromAccountId: '079e4868898',
      fromClearedStatus: '',
      toAccountId: '48688983678',
      toAbsoluteAmount: 500,
    },
    {
      id: '079e4868898',
      name: 'Main USD',
      type: 'Cash',
      currency: 'USD',
      balance: 1000,
    },
    {
      from: {
        id: '079e4868898',
        name: 'Main USD',
        type: 'Cash',
        currency: 'USD',
        balance: 1000,
      },
      to: {
        id: '48688983678',
        name: 'Savings PLN',
        type: 'Cash',
        currency: 'PLN',
        balance: 0,
        description: 'pln',
      },
    },
  );
  expect(updates.size).eq(2);
});
