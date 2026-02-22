import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db, UserSchema, User } from '../../db/client';

export async function usersRoutes(fastify: FastifyInstance) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // Register user via Sync ID
    app.post(
        '/sync-register',
        {
            schema: {
                body: z.object({
                    syncGroupId: z.string(),
                }),
                response: {
                    200: z.object({
                        success: z.boolean(),
                        user: UserSchema,
                        isNew: z.boolean(),
                    }),
                },
            },
        },
        async (req, reply) => {
            const { syncGroupId } = req.body as { syncGroupId: string };

            // Check if user exists
            const result = await db.execute({
                sql: 'SELECT * FROM users WHERE id = ?',
                args: [syncGroupId],
            });

            if (result.rows.length > 0) {
                return {
                    success: true,
                    user: result.rows[0] as unknown as User,
                    isNew: false,
                };
            }

            // Create new user
            await db.execute({
                sql: 'INSERT INTO users (id, credits) VALUES (?, ?)',
                args: [syncGroupId, 5], // Start with 5 free credits
            });

            const newUser = await db.execute({
                sql: 'SELECT * FROM users WHERE id = ?',
                args: [syncGroupId],
            });

            return {
                success: true,
                user: newUser.rows[0] as unknown as User,
                isNew: true,
            };
        }
    );

    // List users (Admin only)
    app.get(
        '/',
        {
            schema: {
                response: {
                    200: z.array(UserSchema.extend({ event_count: z.number().optional() })),
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
            const result = await db.execute(`
                SELECT u.*, COALESCE(e.event_count, 0) as event_count
                FROM users u
                LEFT JOIN (
                    SELECT group_id, COUNT(*) as event_count
                    FROM events
                    GROUP BY group_id
                ) e ON e.group_id = u.id
                ORDER BY u.created_at DESC
            `);
            return result.rows as unknown as { id: string; credits: number; email: string | null; created_at?: string; event_count?: number }[];
        }
    );

    // Update credits (Admin only)
    app.put(
        '/:id/credits',
        {
            schema: {
                params: z.object({ id: z.string() }),
                body: z.object({ credits: z.number() }),
                response: {
                    200: z.object({ success: z.boolean(), credits: z.number() }),
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
            const { id } = req.params as { id: string };
            const { credits } = req.body as { credits: number };

            await db.execute({
                sql: 'UPDATE users SET credits = ? WHERE id = ?',
                args: [credits, id],
            });

            return { success: true, credits };
        }
    );
}
