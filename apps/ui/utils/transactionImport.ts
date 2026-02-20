import type { UploadTransactionsHeaderType } from '~/components/account/UploadTransactionsHeaderType';

export function parseAmount(value: string): number {
    if (!value) return 0;
    return Number(value.replaceAll(',', '.').replace(/[^0-9.-]/g, ''));
}

export function computeAmount(
    row: string[],
    headerMap: Record<UploadTransactionsHeaderType, number>,
): number {
    return (
        (Number.isFinite(headerMap.in) && row[headerMap.in]
            ? Math.abs(parseAmount(row[headerMap.in] ?? ''))
            : 0) ||
        (Number.isFinite(headerMap.out) && row[headerMap.out]
            ? -Math.abs(parseAmount(row[headerMap.out] ?? ''))
            : 0) ||
        parseAmount(row[headerMap.amount] ?? '')
    );
}

export function titleMatchToTransactionKey(
    title: string,
    key: UploadTransactionsHeaderType,
): boolean {
    switch (key) {
        case 'date':
            return /^#?Data/.test(title) || /Date/.test(title);
        case 'category':
            return (
                /^Rodzaj/.test(title) ||
                /^#Opis operacji/.test(title) ||
                /Type/.test(title)
            );
        case 'payee':
            return /^Odbiorca/.test(title) || /^#Nadawca/.test(title);
        case 'memo':
            return (
                /^Opis/.test(title) ||
                /^#Tytuł/.test(title) ||
                /Description/.test(title)
            );
        case 'amount':
            return (
                /^#Kwota/.test(title) ||
                /Amount/.test(title)
            );
        case 'in':
            return (
                /^Uznania/.test(title) ||
                /Credits/.test(title) ||
                /Paid In/.test(title)
            );
        case 'out':
            return (
                /^Obciążenia/.test(title) ||
                /Debits/.test(title) ||
                /Paid Out/.test(title)
            );
        case 'fee':
            return /^Fee$/.test(title);
        case 'state':
            return /^State$/.test(title);
        default:
            return false;
    }
}
