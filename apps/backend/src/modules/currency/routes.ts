import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const CurrencyQuerySchema = z.object({
    base: z.string().default('EUR'),
});

export async function currencyRoutes(server: FastifyInstance) {
    server.get(
        '/rates',
        {
            schema: {
                querystring: CurrencyQuerySchema,
                response: {
                    200: z.object({
                        base: z.string(),
                        date: z.string(),
                        rates: z.record(z.string(), z.number()),
                    }),
                    502: z.object({
                        error: z.string(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const { base } = request.query as z.infer<typeof CurrencyQuerySchema>;

            try {
                // Using frankfurter.app as a free, reliable source for ECB rates
                const response = await fetch(`https://api.frankfurter.app/latest?from=${base}`);

                if (!response.ok) {
                    throw new Error(`Upstream API error: ${response.statusText}`);
                }

                const data = await response.json();
                return data; // Proxies the response directly
            } catch (error) {
                server.log.error(error);
                return reply.code(502).send({ error: 'Failed to fetch currency rates' });
            }
        }
    );
}
