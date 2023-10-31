import { it, expect } from 'vitest';
import { tableHeadersToTransactionKeys } from './tableHeadersToTransactionKeys';
import type { Transaction } from '~/store/transaction';

const headers: { name: keyof Transaction }[][] = [
  [],
  [
    {
      name: 'date',
    },
  ],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
];

it('table headers', () => {
  expect(tableHeadersToTransactionKeys(headers)).eql({ date: 1 });
});
