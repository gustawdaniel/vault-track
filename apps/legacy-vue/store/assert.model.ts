
import { z } from 'zod';

export const AssertModel = z.object({
    id: z.string(),
    accountId: z.string(),
    date: z.string(), // YYYY-MM-DD
    value: z.number(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});

export type Assert = z.infer<typeof AssertModel>;

export interface PersistedAssert extends Assert { }
