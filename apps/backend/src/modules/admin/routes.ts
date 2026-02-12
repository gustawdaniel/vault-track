import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db } from '../../db/client';

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
                    200: z.object({ success: z.boolean(), email: z.string() }),
                    403: z.object({ error: z.string() }),
                    401: z.object({ error: z.string() }),
                },
            },
        },
        async (req, reply) => {
            const { token } = req.body;

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

                // Set secure cookie
                reply.setCookie('admin_session', email, {
                    path: '/',
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 60 * 60 * 24 * 7, // 1 week
                });

                return { success: true, email };
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
                const adminEmail = req.cookies.admin_session;
                if (adminEmail !== process.env.ADMIN_EMAIL) {
                    reply.code(401).send({ error: 'Unauthorized' });
                }
            },
        },
        async (req, reply) => {
            const { query } = req.body;
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
            const email = req.cookies.admin_session;
            if (email === process.env.ADMIN_EMAIL) {
                return { loggedIn: true, email };
            }
            return { loggedIn: false };
        }
    );

    // Check Auth Status (Simple loggedIn flag)


    // Logout
    app.post(
        '/logout',
        async (req, reply) => {
            reply.clearCookie('admin_session');
            return { success: true };
        }
    );
}
