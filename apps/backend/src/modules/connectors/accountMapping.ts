/**
 * Which VaultTrack account each bank account of a consent feeds. One consent (Enable Banking session) usually
 * covers several accounts of one bank: mBank private + business, Revolut and Wise in several currencies.
 *
 *  1. by number: the account's IBAN/BBAN written in the VaultTrack account's description ("22 1140 … 1652"),
 *     several currency pockets behind one IBAN (Revolut) are told apart by currency;
 *  2. by bank and currency: a VaultTrack account named after the bank ("Wise EUR", "Revolut GBP") with the same
 *     currency, when exactly one such pair is left and no other consent feeds that account yet.
 */

export interface BankAccountInfo {
    uid: string;
    identifier: string;
    currency?: string | null;
}

export interface VaultAccountInfo {
    id: string;
    name: string;
    currency?: string | null;
    description?: string | null;
    /** already fed by another consent: never guessed by currency (two Wise profiles both have EUR) */
    fedElsewhere?: boolean;
}

export interface AccountMapping {
    uid: string;
    vaulttrackAccountId: string;
    how: 'number' | 'bank-and-currency';
}

function compact(value?: string | null): string {
    return String(value ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

/** The account number without the IBAN country code, so "PL22 1140…" matches "22 1140…" in a description. */
function numberKey(identifier: string): string {
    const value = compact(identifier);
    return /^[A-Z]{2}\d{2}/.test(value) ? value.slice(2) : value;
}

function sameCurrency(a?: string | null, b?: string | null): boolean {
    return !!a && !!b && a.toUpperCase() === b.toUpperCase();
}

export function mapBankAccounts(
    aspspName: string,
    bank: BankAccountInfo[],
    vault: VaultAccountInfo[],
): AccountMapping[] {
    const result: AccountMapping[] = [];
    const usedBank = new Set<string>();
    const usedVault = new Set<string>();

    for (const account of vault) {
        const description = compact(account.description);
        if (!description) continue;
        const matches = bank.filter((b) => {
            const key = numberKey(b.identifier);
            return key.length >= 8 && description.includes(key) && !usedBank.has(b.uid);
        });
        const chosen = matches.length > 1
            ? matches.find((b) => sameCurrency(b.currency, account.currency))
            : matches[0];
        if (!chosen) continue;
        result.push({ uid: chosen.uid, vaulttrackAccountId: account.id, how: 'number' });
        usedBank.add(chosen.uid);
        usedVault.add(account.id);
    }

    const brands = aspspName.toLowerCase().split(/\s+/).filter((w) => w.length >= 4 && w !== 'bank');
    const named = vault.filter(
        (a) => !usedVault.has(a.id) && !a.fedElsewhere && brands.some((brand) => a.name.toLowerCase().includes(brand)),
    );
    for (const account of named) {
        const bankSide = bank.filter((b) => !usedBank.has(b.uid) && sameCurrency(b.currency, account.currency));
        const vaultSide = named.filter((a) => !usedVault.has(a.id) && sameCurrency(a.currency, account.currency));
        if (bankSide.length !== 1 || vaultSide.length !== 1) continue;
        result.push({ uid: bankSide[0]!.uid, vaulttrackAccountId: account.id, how: 'bank-and-currency' });
        usedBank.add(bankSide[0]!.uid);
        usedVault.add(account.id);
    }
    return result;
}
