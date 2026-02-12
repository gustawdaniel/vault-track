import { uid } from 'uid';

const SEPARATOR = '###';

export function encodeSplitId(payee: string, id?: string): string {
    const cleanId = id || uid();
    if (!payee) return cleanId;
    return `${payee}${SEPARATOR}${cleanId}`;
}

export function decodeSplitId(splitId: string | undefined): { id: string; payee: string | undefined } {
    if (!splitId) return { id: uid(), payee: undefined }; // Should be handled by caller usually

    const parts = splitId.split(SEPARATOR);
    if (parts.length > 1) {
        const id = parts.pop()!; // Last part is ID
        const payee = parts.join(SEPARATOR); // Rest is payee (allows separator in payee)
        return { id, payee };
    }

    return { id: splitId, payee: undefined };
}
