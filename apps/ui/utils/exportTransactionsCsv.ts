import type { FullTransaction } from '~/store/transaction.model';

function escapeCsvValue(value: string): string {
    if (value.includes('"') || value.includes(',') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return `"${value}"`;
}

export function exportTransactionsCsv(transactions: FullTransaction[]): string {
    const headers = ['Date', 'Payee', 'Category', 'Memo', 'Obciążenia', 'Uznania'];
    const lines: string[] = [headers.map(escapeCsvValue).join(',')];

    for (const tx of transactions) {
        const outValue = tx.amount < 0 ? Math.abs(tx.amount).toFixed(2) : '';
        const inValue = tx.amount > 0 ? tx.amount.toFixed(2) : '';

        const row = [
            tx.date || '',
            tx.payee || '',
            tx.category || '',
            tx.memo || '',
            outValue,
            inValue,
        ];

        lines.push(row.map(escapeCsvValue).join(','));
    }

    return lines.join('\n');
}

export function downloadCsv(content: string, filename: string): void {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
