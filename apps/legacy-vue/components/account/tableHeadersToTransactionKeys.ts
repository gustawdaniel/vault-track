import type { UploadTransactionsHeaderType } from '~/components/account/UploadTransactionsHeaderType';

export function tableHeadersToTransactionKeys(
  headers: Array<Array<{ name: UploadTransactionsHeaderType }>>,
): Record<UploadTransactionsHeaderType, number> {
  return headers.reduce(
    (prev, next, index) => {
      if (next.length) {
        next.forEach((header) => {
          prev[header.name] = index;
        });
      }

      return prev;
    },
    {} as Record<UploadTransactionsHeaderType, number>,
  );
}
