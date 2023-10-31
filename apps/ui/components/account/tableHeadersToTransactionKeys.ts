import type { Transaction } from '~/store/transaction';

export function tableHeadersToTransactionKeys(
  headers: Array<Array<{ name: keyof Transaction }>>,
): Record<keyof Transaction, number> {
  return headers.reduce(
    (prev, next, index) => {
      if (next.length) {
        next.forEach((header) => {
          prev[header.name] = index;
        });
      }

      return prev;
    },
    {} as Record<keyof Transaction, number>,
  );
}
