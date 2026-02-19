import { z } from 'zod';
import type { Currency } from './currency';

export type QifAccountType = 'Cash' | 'Bank' | 'CCard';

export type QifAccount = {
    name: string;
    type: QifAccountType;
    currency?: string; // by default USD
    description?: string; // eg account number
    order?: number; // will be used to sort accounts in ui
    hidden?: boolean; // allow to archive instead of delete data
};

export const AccountModel = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['Cash', 'Bank', 'Invst', 'CCard']),
    currency: z.string().optional(), // z.enum(currencies).optional(),
    description: z.string().optional(),
    order: z.number().optional(),
    hidden: z.boolean().optional(),
});

export type AccountType = QifAccountType | 'Invst';

export interface Account extends Omit<QifAccount, 'type' | 'currency'> {
    type: AccountType;
    currency: Currency;
    id: string;
    order?: number;
}

export interface ComputedAccount extends Account {
    balance: number;
}
