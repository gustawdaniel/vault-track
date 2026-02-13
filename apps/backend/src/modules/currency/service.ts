import { db, ExchangeRate } from '../../db/client';

const FIAT_API_URL = 'https://api.frankfurter.app';
const CRYPTO_API_URL = 'https://api.coingecko.com/api/v3';

// Supported Cryptos for now
const CRYPTO_IDS = ['bitcoin', 'ethereum', 'tether', 'solana', 'dogecoin'];

export class CurrencyService {
    async getRates(date: string = new Date().toISOString().split('T')[0]): Promise<Record<string, number>> {
        // Try to get from DB first
        const result = await db.execute({
            sql: 'SELECT currency, rate FROM exchange_rates WHERE date = ?',
            args: [date],
        });

        if (result.rows.length > 0) {
            const rates: Record<string, number> = {};
            for (const row of result.rows) {
                rates[row.currency as string] = row.rate as number;
            }
            // Ensure base USD is there (it's 1.0)
            rates['USD'] = 1.0;
            return rates;
        }

        // If not found for today, try to fetch and store
        // Only fetch if it's today or yesterday (historical fetching might need paid API for some, mostly Frankfurter is free)
        // For now, if missing, we try to fetch "latest" if date is today, or historical if supported.
        // Frankfurter supports historical. CoinGecko free tier doesn't support historical bulk easily without multiple calls.
        // Let's implement fetchAndStore for "latest" which is what the cron will use.
        // If a specific past date is requested and missing, we might return empty or fallback to latest available.

        return {};
    }

    async fetchAndStoreRates(): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        console.log(`[CurrencyService] Fetching rates for ${today}...`);

        try {
            const rates: Record<string, number> = {};

            // 1. Fetch Fiat (Base USD)
            // Frankfurter uses EUR as base usually, but supports 'from'.
            const fiatResponse = await fetch(`${FIAT_API_URL}/latest?from=USD`);
            if (fiatResponse.ok) {
                const data = await fiatResponse.json();
                Object.assign(rates, data.rates);
            } else {
                console.error('[CurrencyService] Failed to fetch Fiat rates from Frankfurter', fiatResponse.statusText);
            }

            // 1b. Fallback/Supplement for missing currencies (TND, TWD, GEL, PHP, etc if missing)
            // Specifically check for TND, TWD, GEL as requested by user
            const requiredFiats = ['TND', 'TWD', 'GEL', 'PHP', 'THB', 'MYR']; // Ensure these are present
            const missingFiats = requiredFiats.filter(c => !rates[c]);

            if (missingFiats.length > 0) {
                console.log(`[CurrencyService] Missing rates for ${missingFiats.join(', ')}. Trying fallback API...`);
                try {
                    const fallbackResponse = await fetch('https://latest.currency-api.pages.dev/v1/currencies/usd.json');
                    if (fallbackResponse.ok) {
                        const data = await fallbackResponse.json();
                        // data.date, data.usd = { tnd: 3.1, ... }
                        // The API returns rates relative to USD in 'usd' object, but keys are lowercase!
                        if (data.usd) {
                            for (const code of missingFiats) {
                                const rate = data.usd[code.toLowerCase()];
                                if (rate) {
                                    rates[code] = rate;
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error('[CurrencyService] Fallback API failed', err);
                }
            }

            // 2. Fetch Crypto (vs USD)
            const cryptoResponse = await fetch(
                `${CRYPTO_API_URL}/simple/price?ids=${CRYPTO_IDS.join(',')}&vs_currencies=usd`
            );

            if (cryptoResponse.ok) {
                const data = await cryptoResponse.json();
                // Data format: { bitcoin: { usd: 50000 }, ... }
                // We want rate relative to USD.
                // If Bitcoin is 50000 USD, then 1 BTC = 50000 USD.
                // Wait, exchange rate usually means "How much Quote for 1 Base".
                // If Base is USD, we want "How much BTC for 1 USD"? 
                // No, usually we treat USD as the common denominator.
                // If I have 1 BTC, I want to know it's worth 50000 USD.
                // In my DB, I should probably store "Value of 1 Unit in USD" or "Value of 1 USD in Unit"?
                // Standard Forex: USD/EUR = 0.9 (1 USD = 0.9 EUR).
                // Crypto: BTC/USD = 50000 (1 BTC = 50000 USD).
                // To normalize, let's store everything as "Price in USD" or "1 USD = X Unit".
                // Fiat API (from=USD) returns: EUR: 0.92. This means 1 USD = 0.92 EUR.
                // Crypto API returns: bitcoin: { usd: 50000 }. This means 1 BTC = 50000 USD.
                // So 1 USD = 1/50000 BTC.
                // To be consistent with Fiat (Quote currency amount per 1 USD), we should store 1/Price for Crypto.

                for (const [id, prices] of Object.entries(data as Record<string, { usd: number }>)) {
                    // Map CoinGecko ID to Symbol if possible, or use ID.
                    // For now using ID uppercase as symbol proxy or we need a map.
                    const symbolMap: Record<string, string> = {
                        'bitcoin': 'BTC',
                        'ethereum': 'ETH',
                        'tether': 'USDT',
                        'solana': 'SOL',
                        'dogecoin': 'DOGE',
                    };
                    const symbol = symbolMap[id] || id.toUpperCase();

                    if (prices.usd > 0) {
                        rates[symbol] = 1 / prices.usd;
                    }
                }
            } else {
                console.error('[CurrencyService] Failed to fetch Crypto rates', cryptoResponse.statusText);
            }

            // 3. Store in DB
            // Use transaction or batch insert
            const statements = Object.entries(rates).map(([currency, rate]) => ({
                sql: `INSERT INTO exchange_rates (date, currency, rate) VALUES (?, ?, ?) 
                      ON CONFLICT(date, currency) DO UPDATE SET rate = excluded.rate`,
                args: [today, currency, rate]
            }));

            if (statements.length > 0) {
                await db.batch(statements);
                console.log(`[CurrencyService] Stored ${statements.length} rates.`);
            }

        } catch (error) {
            console.error('[CurrencyService] Error fetching rates:', error);
        }
    }
}

export const currencyService = new CurrencyService();
