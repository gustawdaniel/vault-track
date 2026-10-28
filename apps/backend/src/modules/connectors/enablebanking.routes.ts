import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db } from '../../db/client';
import {
    getSessionAccounts,
    createSession,
    EnableBankingAccount,
    getAccountIban,
    getEnableBankingConfig,
    listAspsps,
    startAuthorization,
    syncEnableBankingLink,
} from './enablebanking';

import { mapBankAccounts } from './accountMapping';

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

/** Points a VaultTrack account at one bank account of a consent: the consent's own link or a sibling link. */
async function upsertMappedLink(link: any, providerAccountUid: string, vaulttrackAccountId: string) {
    if (vaulttrackAccountId === String(link.vaulttrack_account_id)) {
        await db.execute({
            sql: `UPDATE connector_links SET provider_account_id = ?, provider_accounts_json = ?, error = NULL WHERE id = ?`,
            args: [providerAccountUid, link.provider_accounts_json ?? null, String(link.id)],
        });
        link.provider_account_id = providerAccountUid;
        return;
    }
    const existing = await db.execute({
        sql: `SELECT id FROM connector_links WHERE group_id = ? AND session_id = ? AND vaulttrack_account_id = ? LIMIT 1`,
        args: [String(link.group_id), String(link.session_id), vaulttrackAccountId],
    });
    if (existing.rows.length > 0) {
        await db.execute({
            sql: `UPDATE connector_links SET provider_account_id = ?, provider_accounts_json = ?, status = 'authorized', error = NULL WHERE id = ?`,
            args: [providerAccountUid, link.provider_accounts_json ?? null, String((existing.rows[0] as any).id)],
        });
        return;
    }
    await db.execute({
        sql: `INSERT INTO connector_links
                (id, group_id, provider, aspsp_name, state, session_id, provider_account_id, provider_accounts_json,
                 vaulttrack_account_id, status, created_at, expires_at)
              VALUES (?, ?, 'enablebanking', ?, ?, ?, ?, ?, ?, 'authorized', ?, ?)`,
        args: [
            crypto.randomUUID(), String(link.group_id), link.aspsp_name ?? null, crypto.randomUUID(),
            String(link.session_id), providerAccountUid, link.provider_accounts_json ?? null,
            vaulttrackAccountId, Date.now(), link.expires_at ?? null,
        ],
    });
}

/** Maps every account of an authorized consent to VaultTrack accounts (accountMapping.ts) and stores the links. */
async function applySessionMapping(link: any, accounts: EnableBankingAccount[]) {
    link.provider_accounts_json = JSON.stringify(accounts);
    await db.execute({
        sql: `UPDATE connector_links SET provider_accounts_json = ? WHERE id = ?`,
        args: [link.provider_accounts_json, String(link.id)],
    });
    const vault = (await db.execute({
        sql: `SELECT id, name, currency, description FROM accounts WHERE group_id = ?`,
        args: [String(link.group_id)],
    })).rows as any[];
    const mapping = mapBankAccounts(
        String(link.aspsp_name || ''),
        accounts.map((a: any) => ({ uid: a.uid, identifier: getAccountIban(a), currency: a.currency })),
        vault.map((v) => ({ id: String(v.id), name: String(v.name), currency: v.currency, description: v.description })),
    );
    for (const m of mapping) await upsertMappedLink(link, m.uid, m.vaulttrackAccountId);
    return mapping;
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
                let accounts = session.accounts || [];
                if (accounts.length === 0) accounts = await getSessionAccounts(config, session.session_id);
                const expiresAt = session.access?.valid_until ? new Date(session.access.valid_until).getTime() : null;

                await db.execute({
                    sql: `UPDATE connector_links
                          SET session_id = ?, provider_accounts_json = ?, status = 'authorized', expires_at = ?, error = NULL
                          WHERE id = ?`,
                    args: [session.session_id, JSON.stringify(accounts), expiresAt, String(link.id)],
                });
                const mapped = { ...link, session_id: session.session_id, expires_at: expiresAt };
                const mapping = await applySessionMapping(mapped, accounts);
                const providerAccount = accounts.find((a) => a.uid === mapped.provider_account_id) ?? null;

                if (wantsHtml) {
                    return reply.type('text/html').send(successPage(accounts));
                }

                return {
                    success: true,
                    linkId: String(link.id),
                    sessionId: session.session_id,
                    providerAccountId: providerAccount?.uid || null,
                    mapping,
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

            return { results: await syncGroupLinks(groupId, config, req.body as any) };
        },
    );

    // Point a VaultTrack account at one bank account of an existing consent (when automatic mapping cannot tell).
    app.post(
        '/map',
        {
            schema: {
                body: z.object({
                    linkId: z.string().min(1),
                    providerAccountUid: z.string().min(1),
                    vaulttrackAccountId: z.string().min(1),
                }),
            },
        },
        async (req, reply) => {
            const groupId = req.headers['x-sync-group-id'] as string;
            if (!groupId) {
                return reply.code(400).send({ error: 'Missing X-Sync-Group-ID header' });
            }
            const { linkId, providerAccountUid, vaulttrackAccountId } = req.body as any;
            const link = await getLink(groupId, linkId);
            if (!link || !link.session_id) {
                return reply.code(404).send({ error: 'Authorized consent not found' });
            }
            if (!parseAccounts(link.provider_accounts_json).some((a) => a.uid === providerAccountUid)) {
                return reply.code(400).send({ error: 'This consent does not cover that bank account' });
            }
            if (!(await getVaulttrackAccount(groupId, vaulttrackAccountId))) {
                return reply.code(404).send({ error: `Account ${vaulttrackAccountId} not found` });
            }
            await upsertMappedLink(link, providerAccountUid, vaulttrackAccountId);
            return { success: true };
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

/**
 * Fetches new transactions for the authorized links of a group (all of them, or one).
 * Used by POST /sync and by the background schedule (startBankSyncSchedule).
 */
export async function syncGroupLinks(
    groupId: string,
    config: NonNullable<ReturnType<typeof getEnableBankingConfig>>,
    body: { linkId?: string; dateFrom?: string } = {},
): Promise<any[]> {
    // consents that came back without a mapped account: read their accounts again and map them all
    const unmapped = (await db.execute({
        sql: `SELECT * FROM connector_links
              WHERE group_id = ? AND provider = 'enablebanking' AND status = 'authorized'
                AND provider_account_id IS NULL AND session_id IS NOT NULL`,
        args: [groupId],
    })).rows as any[];
    const notes = new Map<string, string>();
    for (const link of unmapped) {
        try {
            const accounts = await getSessionAccounts(config, String(link.session_id));
            const mapping = await applySessionMapping(link, accounts);
            if (!link.provider_account_id) {
                notes.set(String(link.id), `the bank shared ${accounts.length} accounts, ${mapping.length} mapped elsewhere`);
            }
        } catch (error: any) {
            notes.set(String(link.id), `session accounts: ${error?.message || error}`);
        }
    }

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
        const mappingNote = notes.get(String(link.id)) ?? '';
        if (!link.provider_account_id || !link.vaulttrack_account_id) {
            results.push({
                linkId: String(link.id),
                skipped: true,
                reason: 'missing provider or vaulttrack account mapping' + (mappingNote ? ` (${mappingNote})` : ''),
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
            const message = error?.message || String(error);
            await db.execute({
                sql: `UPDATE connector_links SET error = ?, status = CASE WHEN ? THEN 'expired' ELSE status END WHERE id = ?`,
                args: [message, /EXPIRED_SESSION|Session is expired/.test(message) ? 1 : 0, String(link.id)],
            });
            results.push({
                linkId: String(link.id),
                error: error?.message || String(error),
            });
        }
    }

    return results;
}

/**
 * Banks allow about four unattended reads a day (PSD2), so every group with a consent is synced every 6 hours.
 */
export function startBankSyncSchedule(intervalMs = 6 * 60 * 60 * 1000) {
    const run = async () => {
        const config = getEnableBankingConfig();
        if (!config) return;
        const groups = (await db.execute(
            `SELECT DISTINCT group_id FROM connector_links WHERE provider = 'enablebanking' AND status = 'authorized'`,
        )).rows as any[];
        for (const row of groups) {
            try {
                const results = await syncGroupLinks(String(row.group_id), config);
                const imported = results.reduce((sum, r) => sum + Number(r.imported || 0), 0);
                console.log(`[bank-sync] ${String(row.group_id).slice(0, 8)}: +${imported}`);
            } catch (error: any) {
                console.error('[bank-sync]', error?.message || error);
            }
        }
    };
    setTimeout(run, 60 * 1000);
    return setInterval(run, intervalMs);
}
