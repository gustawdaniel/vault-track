import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import cron from 'node-cron';
import { currencyService } from './service';

const CurrencyQuerySchema = z.object({
    base: z.string().default('USD'), // Default to USD as we store relative to USD
    date: z.string().optional(),
});

export async function currencyRoutes(server: FastifyInstance) {
    // Schedule Daily Update at Midnight UTC
    cron.schedule('0 0 * * *', async () => {
        server.log.info('Running Daily Exchange Rate Sync...');
        await currencyService.fetchAndStoreRates();
    });

    // Optional: Run on startup if dev or empty? 
    // Let's create an endpoint to force sync for now.

    server.post('/rates/sync', async (request, reply) => {
        await currencyService.fetchAndStoreRates();
        return { success: true };
    });

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
            const { base, date } = request.query as z.infer<typeof CurrencyQuerySchema>;
            const targetDate = date || new Date().toISOString().split('T')[0];

            try {
                // Get rates from DB (Base USD)
                let rates = await currencyService.getRates(targetDate);

                // If rates empty and it's today, try fetch
                if (Object.keys(rates).length === 0 && targetDate === new Date().toISOString().split('T')[0]) {
                    await currencyService.fetchAndStoreRates();
                    rates = await currencyService.getRates(targetDate);
                }

                // If requesting different base, we need to convert?
                // Our DB stores "1 USD = X Currency".
                // So rates = { EUR: 0.92, BTC: 0.00002 } relative to USD.
                // If user asks base=EUR, we divide everything by EUR rate.
                // New Rate for Currency C = (Rate C / Rate Base)

                if (base !== 'USD' && rates[base]) {
                    const baseRate = rates[base];
                    const convertedRates: Record<string, number> = {};
                    for (const [curr, rate] of Object.entries(rates)) {
                        convertedRates[curr] = rate / baseRate; // 1 Base = (Rate/BaseRate) Curr
                    }
                    rates = convertedRates;
                } else if (base !== 'USD' && !rates[base]) {
                    // Base currency not found
                    // fallback or return as is (USD based)
                }

                return {
                    base,
                    date: targetDate,
                    rates
                };
            } catch (error) {
                server.log.error(error);
                return reply.code(502).send({ error: 'Failed to fetch currency rates' });
            }
        }
    );
}
