// [Gotówka EUR]/A:Sub
import { it, expect } from 'vitest';
import { type Transaction, Trx } from '~/store/transaction';

it('transaction hash is computed correctly', () => {
  const t1: Transaction = {
    account: 'Cash PLN',
    accountId: '1',
    amount: 5,
    category: '[Cash EUR]/A:Sub',
    date: '2023-01-10T00:00:00',
  };
  const t2: Transaction = {
    account: 'Cash EUR',
    accountId: '1',
    amount: -5,
    category: '[Cash PLN]/A:Sub',
    date: '2023-01-10T00:00:00',
  };

  const trx1 = new Trx(t1);
  const trx2 = new Trx(t2);

  expect(trx1.data.transferHash).toBeDefined();
  expect(trx2.data.transferHash).toBeDefined();
  expect(trx1.data.transferHash).eq(trx2.data.transferHash);
});
