import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db } from '../../db/client';
import {
    createSession,
    EnableBankingAccount,
    getAccountIban,
    getEnableBankingConfig,
    listAspsps,
    startAuthorization,
    syncEnableBankingLink,
} from './enablebanking';

const DEFAULT_REDIRECT_URL = 'https://api.vaulttrack.org/api/connectors/enablebanking/callback';

function normalizeIban(value: unknown): string {
    return String(value || '').replace(/\s+/g, '').toUpperCase();
}

async function getVaulttrackAccount(groupId: string, accountId: string) {
    const result = await db.execute({
        sql: `SELECT id, name, currency, description FROM accounts
              WHERE group_id = ? AND id = ? LIMIT 1`,
        args: [groupId, accountId],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0] as any;
    return {
        id: String(row.id),
        name: String(row.name),
        currency: row.currency ? String(row.currency) : undefined,
        description: row.description ? String(row.description) : undefined,
    };
}

async function getLink(groupId: string, linkId: string) {
    const result = await db.execute({
        sql: `SELECT * FROM connector_links WHERE group_id = ? AND id = ? LIMIT 1`,
        args: [groupId, linkId],
    });
    return result.rows.length > 0 ? (result.rows[0] as any) : null;
}

async function getLinkByState(state: string) {
    const result = await db.execute({
        sql: `SELECT * FROM connector_links WHERE state = ? LIMIT 1`,
        args: [state],
    });
    return result.rows.length > 0 ? (result.rows[0] as any) : null;
}

function chooseProviderAccount(
    accounts: EnableBankingAccount[],
    vaulttrackDescription?: string,
): EnableBankingAccount | null {
    if (accounts.length === 0) return null;

    const wanted = normalizeIban(vaulttrackDescription);
    if (wanted) {
        const match = accounts.find((account) => {
            const candidate = normalizeIban(getAccountIban(account));
            return candidate && (candidate.includes(wanted) || wanted.includes(candidate));
        });
        if (match) return match;
    }

    return accounts[0] || null;
}

function parseAccounts(value: unknown): EnableBankingAccount[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(String(value));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function successPage(accounts: EnableBankingAccount[]): string {
    const rows = accounts
        .map((account) => `<li>${account.name || 'Account'} — ${getAccountIban(account) || account.uid} (${account.currency || '?'})</li>`)
        .join('');

    return `<!doctype html>
<html lang="pl">
<head><meta charset="utf-8"><title>VaultTrack — bank connected</title>
<style>body{font-family:system-ui,sans-serif;max-width:680px;margin:64px auto;padding:0 24px;color:#0f172a}code{background:#f1f5f9;padding:2px 6px;border-radius:4px}</style>
</head>
<body>
<h1>Bank połączony</h1>
<p>Enable Banking utworzył sesję dla Twoich kont. Możesz wrócić do aplikacji.</p>
<ul>${rows}</ul>
<p><a href="https://vaulttrack.org">Otwórz VaultTrack</a></p>
</body>
</html>`;
}

export async function enableBankingRoutes(fastify: FastifyInstance) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    app.get(
        '/aspsps',
        {
            schema: {
                querystring: z.object({ country: z.string().default('PL') }),
                response: {
                    200: z.object({ aspsps: z.array(z.any()) }),
                    503: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const config = getEnableBankingConfig();
            if (!config) {
                return reply.code(503).send({ error: 'Enable Banking is not configured' });
            }
            const { country } = req.query as { country: string };
            return { aspsps: await listAspsps(config, country) };
        },
    );

    app.post(
        '/connect',
        {
            schema: {
                body: z.object({
                    aspspName: z.string().min(1),
                    country: z.string().default('PL'),
                    vaulttrackAccountId: z.string().min(1),
                    redirectUrl: z.string().url().optional(),
                    psuType: z.enum(['personal', 'business']).optional(),
                    validUntilDays: z.number().int().min(1).max(180).optional(),
                }),
                response: {
                    200: z.object({ linkId: z.string(), state: z.string(), url: z.string() }),
                    400: z.object({ error: z.string() }),
                    404: z.object({ error: z.string() }),
                    500: z.object({ error: z.string() }),
                    503: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const groupId = req.headers['x-sync-group-id'] as string;
            if (!groupId) {
                return reply.code(400).send({ error: 'Missing X-Sync-Group-ID header' });
            }

            const config = getEnableBankingConfig();
            if (!config) {
                return reply.code(503).send({ error: 'Enable Banking is not configured' });
            }

            const body = req.body as any;
            const redirectUrl = body.redirectUrl || config.redirectUrl || DEFAULT_REDIRECT_URL;
            if (!redirectUrl.startsWith('https://')) {
                return reply.code(400).send({ error: 'redirectUrl must use HTTPS' });
            }

            const account = await getVaulttrackAccount(groupId, body.vaulttrackAccountId);
            if (!account) {
                return reply.code(404).send({ error: `Account ${body.vaulttrackAccountId} not found` });
            }

            const id = crypto.randomUUID();
            const state = crypto.randomUUID();

            await db.execute({
                sql: `INSERT INTO connector_links
                        (id, group_id, provider, aspsp_name, state, vaulttrack_account_id, status, created_at)
                      VALUES (?, ?, 'enablebanking', ?, ?, ?, 'pending', ?)`,
                args: [id, groupId, body.aspspName, state, account.id, Date.now()],
            });

            try {
                const authorization = await startAuthorization(config, {
                    aspspName: body.aspspName,
                    country: body.country,
                    state,
                    redirectUrl,
                    psuType: body.psuType,
                    validUntilDays: body.validUntilDays,
                });

                return { linkId: id, state, url: authorization.url };
            } catch (error: any) {
                await db.execute({
                    sql: `UPDATE connector_links SET status = 'error', error = ? WHERE id = ?`,
                    args: [error?.message || String(error), id],
                });
                return reply.code(500).send({ error: error?.message || String(error) });
            }
        },
    );

    app.get(
        '/callback',
        {
            schema: {
                querystring: z.object({
                    code: z.string().optional(),
                    state: z.string().optional(),
                    error: z.string().optional(),
                    error_description: z.string().optional(),
                }),
            },
        },
        async (req, reply) => {
            const { code, state, error, error_description } = req.query as any;
            const wantsHtml = String(req.headers.accept || '').includes('text/html');

            if (error) {
                const message = error_description || error;
                if (wantsHtml) {
                    return reply.type('text/html').send(
                        `<h1>Authorization failed</h1><p>${message}</p>`,
                    );
                }
                return reply.code(400).send({ error: message });
            }

            if (!code || !state) {
                return reply.code(400).send({ error: 'Missing code or state' });
            }

            const config = getEnableBankingConfig();
            if (!config) {
                return reply.code(503).send({ error: 'Enable Banking is not configured' });
            }

            const link = await getLinkByState(state);
            if (!link) {
                return reply.code(400).send({ error: 'Unknown or expired state' });
            }

            try {
                const session = await createSession(config, code);
                const accounts = session.accounts || [];
                const vaulttrackAccount = link.vaulttrack_account_id
                    ? await getVaulttrackAccount(String(link.group_id), String(link.vaulttrack_account_id))
                    : null;
                const providerAccount = chooseProviderAccount(
                    accounts,
                    vaulttrackAccount?.description,
                );

                await db.execute({
                    sql: `UPDATE connector_links
                          SET session_id = ?, provider_account_id = ?, provider_accounts_json = ?,
                              status = 'authorized', expires_at = ?, error = NULL
                          WHERE id = ?`,
                    args: [
                        session.session_id,
                        providerAccount?.uid || null,
                        JSON.stringify(accounts),
                        session.access?.valid_until
                            ? new Date(session.access.valid_until).getTime()
                            : null,
                        String(link.id),
                    ],
                });

                if (wantsHtml) {
                    return reply.type('text/html').send(successPage(accounts));
                }

                return {
                    success: true,
                    linkId: String(link.id),
                    sessionId: session.session_id,
                    providerAccountId: providerAccount?.uid || null,
                    accounts,
                };
            } catch (error: any) {
                await db.execute({
                    sql: `UPDATE connector_links SET status = 'error', error = ? WHERE id = ?`,
                    args: [error?.message || String(error), String(link.id)],
                });
                return reply.code(500).send({ error: error?.message || String(error) });
            }
        },
    );

    app.post(
        '/sync',
        {
            schema: {
                body: z.object({
                    linkId: z.string().optional(),
                    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
                }),
                response: {
                    200: z.object({ results: z.array(z.any()) }),
                    400: z.object({ error: z.string() }),
                    503: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const groupId = req.headers['x-sync-group-id'] as string;
            if (!groupId) {
                return reply.code(400).send({ error: 'Missing X-Sync-Group-ID header' });
            }

            const config = getEnableBankingConfig();
            if (!config) {
                return reply.code(503).send({ error: 'Enable Banking is not configured' });
            }

            const body = req.body as any;
            const result = body.linkId
                ? await getLink(groupId, body.linkId)
                : null;

            const links = result
                ? [result]
                : (await db.execute({
                    sql: `SELECT * FROM connector_links
                          WHERE group_id = ? AND provider = 'enablebanking' AND status = 'authorized'
                          ORDER BY created_at DESC`,
                    args: [groupId],
                })).rows as any[];

            const results: any[] = [];

            for (const link of links) {
                if (!link.provider_account_id || !link.vaulttrack_account_id) {
                    results.push({
                        linkId: String(link.id),
                        skipped: true,
                        reason: 'missing provider or vaulttrack account mapping',
                    });
                    continue;
                }

                const account = await getVaulttrackAccount(
                    String(link.group_id),
                    String(link.vaulttrack_account_id),
                );
                if (!account) {
                    results.push({
                        linkId: String(link.id),
                        skipped: true,
                        reason: 'vaulttrack account not found',
                    });
                    continue;
                }

                try {
                    const dateFrom = body.dateFrom
                        || (link.last_sync_at
                            ? new Date(Number(link.last_sync_at) - 24 * 60 * 60 * 1000)
                                .toISOString()
                                .slice(0, 10)
                            : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                                .toISOString()
                                .slice(0, 10));

                    const sync = await syncEnableBankingLink(db, config, {
                        groupId,
                        accountId: account.id,
                        accountName: account.name,
                        accountCurrency: account.currency,
                        aspspName: String(link.aspsp_name || 'bank'),
                        providerAccountId: String(link.provider_account_id),
                        dateFrom,
                    });

                    await db.execute({
                        sql: `UPDATE connector_links SET last_sync_at = ?, error = NULL WHERE id = ?`,
                        args: [Date.now(), String(link.id)],
                    });

                    results.push({
                        linkId: String(link.id),
                        aspspName: String(link.aspsp_name || ''),
                        dateFrom,
                        ...sync,
                    });
                } catch (error: any) {
                    await db.execute({
                        sql: `UPDATE connector_links SET error = ? WHERE id = ?`,
                        args: [error?.message || String(error), String(link.id)],
                    });
                    results.push({
                        linkId: String(link.id),
                        error: error?.message || String(error),
                    });
                }
            }

            return { results };
        },
    );

    app.get(
        '/status',
        {
            schema: {
                response: {
                    200: z.object({ links: z.array(z.any()) }),
                    400: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const groupId = req.headers['x-sync-group-id'] as string;
            if (!groupId) {
                return reply.code(400).send({ error: 'Missing X-Sync-Group-ID header' });
            }

            const rows = (await db.execute({
                sql: `SELECT * FROM connector_links
                      WHERE group_id = ? AND provider = 'enablebanking'
                      ORDER BY created_at DESC`,
                args: [groupId],
            })).rows as any[];

            return {
                links: rows.map((row) => ({
                    id: String(row.id),
                    aspspName: row.aspsp_name ? String(row.aspsp_name) : null,
                    status: String(row.status),
                    vaulttrackAccountId: row.vaulttrack_account_id
                        ? String(row.vaulttrack_account_id)
                        : null,
                    providerAccountId: row.provider_account_id
                        ? String(row.provider_account_id)
                        : null,
                    accounts: parseAccounts(row.provider_accounts_json).map((account) => ({
                        uid: account.uid,
                        name: account.name || null,
                        iban: getAccountIban(account) || null,
                        currency: account.currency || null,
                    })),
                    createdAt: Number(row.created_at),
                    expiresAt: row.expires_at === null ? null : Number(row.expires_at),
                    lastSyncAt: row.last_sync_at === null ? null : Number(row.last_sync_at),
                    error: row.error ? String(row.error) : null,
                })),
            };
        },
    );
}
