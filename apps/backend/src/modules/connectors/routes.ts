import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db } from '../../db/client';
import {
    getConnectorStatus,
    ingestTransactions,
    logConnectorRun,
    upsertConnectorAssert,
} from './service';

const ConnectorTransactionSchema = z.object({
    externalId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount: z.number(),
    payee: z.string().optional(),
    memo: z.string().optional(),
    category: z.string().optional(),
    currency: z.string().optional(),
    balance: z.number().optional(),
    raw: z.any().optional(),
});

async function resolveAccount(groupId: string, accountId: string, fallbackName?: string) {
    const result = await db.execute({
        sql: `SELECT id, name, currency FROM accounts WHERE group_id = ? AND id = ? LIMIT 1`,
        args: [groupId, accountId],
    });
    if (result.rows.length > 0) {
        const row = result.rows[0] as any;
        return {
            id: String(row.id),
            name: String(row.name),
            currency: row.currency ? String(row.currency) : undefined,
        };
    }
    if (fallbackName) {
        return { id: accountId, name: fallbackName };
    }
    return null;
}

export async function connectorRoutes(fastify: FastifyInstance) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // Ingest transactions from a bank/CSV/brain connector.
    app.post(
        '/transactions',
        {
            schema: {
                body: z.object({
                    source: z.string().min(1),
                    accountId: z.string().min(1),
                    account: z.string().optional(),
                    transactions: z.array(ConnectorTransactionSchema).min(1),
                }),
                response: {
                    200: z.object({
                        success: z.boolean(),
                        imported: z.number(),
                        skipped: z.number(),
                        total: z.number(),
                        transactionIds: z.array(z.string()),
                    }),
                    400: z.object({ error: z.string() }),
                    404: z.object({ error: z.string() }),
                    500: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const groupId = req.headers['x-sync-group-id'] as string;
            if (!groupId) {
                return reply.code(400).send({ error: 'Missing X-Sync-Group-ID header' });
            }

            const { source, accountId, account, transactions } = req.body as any;
            const startedAt = Date.now();

            const resolved = await resolveAccount(groupId, accountId, account);
            if (!resolved) {
                return reply.code(404).send({
                    error: `Account ${accountId} does not exist for this group. Import the backup or create the account first.`,
                });
            }

            try {
                const result = await ingestTransactions(
                    db,
                    groupId,
                    source,
                    resolved,
                    transactions,
                );

                await logConnectorRun(db, {
                    groupId,
                    source,
                    startedAt,
                    status: 'ok',
                    imported: result.imported,
                    skipped: result.skipped,
                    details: { accountId, total: result.total },
                });

                return { success: true, ...result };
            } catch (e: any) {
                await logConnectorRun(db, {
                    groupId,
                    source,
                    startedAt,
                    status: 'error',
                    imported: 0,
                    skipped: 0,
                    error: e?.message || String(e),
                    details: { accountId },
                }).catch(() => undefined);

                console.error('Connector ingest error:', e);
                return reply.code(500).send({ error: 'Connector ingest failed: ' + (e?.message || e) });
            }
        },
    );

    // Upsert a balance assertion fetched directly from the bank.
    app.post(
        '/assert',
        {
            schema: {
                body: z.object({
                    source: z.string().min(1),
                    accountId: z.string().min(1),
                    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
                    value: z.number(),
                    currency: z.string().optional(),
                }),
                response: {
                    200: z.object({
                        success: z.boolean(),
                        id: z.string(),
                        created: z.boolean(),
                    }),
                    400: z.object({ error: z.string() }),
                    404: z.object({ error: z.string() }),
                    500: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const groupId = req.headers['x-sync-group-id'] as string;
            if (!groupId) {
                return reply.code(400).send({ error: 'Missing X-Sync-Group-ID header' });
            }

            const { source, accountId, date, value } = req.body as any;
            const resolved = await resolveAccount(groupId, accountId);
            if (!resolved) {
                return reply.code(404).send({ error: `Account ${accountId} does not exist for this group.` });
            }

            try {
                const result = await upsertConnectorAssert(db, groupId, source, {
                    accountId,
                    date,
                    value,
                });
                return { success: true, ...result };
            } catch (e: any) {
                console.error('Connector assert error:', e);
                return reply.code(500).send({ error: 'Assert upsert failed: ' + (e?.message || e) });
            }
        },
    );

    // Latest run per connector source.
    app.get(
        '/status',
        {
            schema: {
                response: {
                    200: z.object({
                        connectors: z.array(z.object({
                            source: z.string(),
                            status: z.string(),
                            imported: z.number(),
                            skipped: z.number(),
                            startedAt: z.number(),
                            finishedAt: z.number().nullable(),
                            error: z.string().nullable(),
                        })),
                    }),
                    400: z.object({ error: z.string() }),
                    500: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const groupId = req.headers['x-sync-group-id'] as string;
            if (!groupId) {
                return reply.code(400).send({ error: 'Missing X-Sync-Group-ID header' });
            }

            try {
                return { connectors: await getConnectorStatus(db, groupId) };
            } catch (e: any) {
                console.error('Connector status error:', e);
                return reply.code(500).send({ error: 'Status fetch failed: ' + (e?.message || e) });
            }
        },
    );
}
