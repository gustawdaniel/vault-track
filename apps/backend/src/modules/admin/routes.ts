import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db } from '../../db/client';
import { generateToken, verifyToken, extractBearerToken } from '../../utils/adminToken';

const client = new OAuth2Client();

export async function adminRoutes(fastify: FastifyInstance) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // Verify Google Token and Set Cookie
    app.post(
        '/login',
        {
            schema: {
                body: z.object({
                    token: z.string(),
                }),
                response: {
                    200: z.object({ success: z.boolean(), email: z.string(), token: z.string() }),
                    403: z.object({ error: z.string() }),
                    401: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const { token } = req.body as { token: string };

            try {
                const ticket = await client.verifyIdToken({
                    idToken: token,
                    audience: process.env.GOOGLE_CLIENT_ID,
                });

                const payload = ticket.getPayload();
                const email = payload?.email || '';

                if (email !== process.env.ADMIN_EMAIL) {
                    return reply.code(403).send({ error: 'Access denied. Only specific admin allowed.' });
                }

                const sessionToken = generateToken(email);

                return { success: true, email, token: sessionToken };
            } catch (error) {
                console.error('Google Auth Error:', error);
                return reply.code(401).send({ error: 'Invalid token: ' + (error as Error).message });
            }
        }
    );

    // SQL Query (Admin only)
    app.post(
        '/query',
        {
            schema: {
                body: z.object({ query: z.string() }),
                response: {
                    200: z.object({
                        success: z.boolean(),
                        columns: z.array(z.string()),
                        rows: z.array(z.any()),
                        error: z.string().optional(),
                    }),
                    400: z.object({ error: z.string() }),
                    401: z.object({ error: z.string() }),
                },
            },
            preHandler: async (req, reply) => {
                const token = extractBearerToken(req);
                if (!token || !verifyToken(token)) {
                    reply.code(401).send({ error: 'Unauthorized' });
                }
            },
        },
        async (req, reply) => {
            const { query } = req.body as { query: string };
            try {
                const result = await db.execute(query);
                return {
                    success: true,
                    columns: result.columns,
                    rows: result.rows,
                };
            } catch (e: any) {
                return reply.code(400).send({ error: e.message });
            }
        }
    );

    // Check login status
    app.get(
        '/me',
        async (req, reply) => {
            const token = extractBearerToken(req);
            const email = token ? verifyToken(token) : null;

            if (email) {
                return { loggedIn: true, email };
            }
            return { loggedIn: false };
        }
    );

    // Logout
    app.post(
        '/logout',
        async (req, reply) => {
            return { success: true };
        }
    );
}
