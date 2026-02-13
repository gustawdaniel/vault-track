import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import dayjs from 'dayjs';

interface ExchangeRatesState {
    base: string;
    date: string;
    rates: Record<string, number>;
}

export const useExchangeRateStore = defineStore('exchangeRates', () => {
    const ratesData = useLocalStorage<ExchangeRatesState>('exchange-rates', {
        base: 'USD',
        date: '',
        rates: { 'USD': 1 }
    });

    const loading = ref(false);

    // Fetch rates from backend
    async function fetchRates(base: string = 'USD') {
        // Check if we already have today's rates for this base?
        // Optimization: if date is today, skip? 
        // For now, simple fetch.
        loading.value = true;
        try {
            const config = useRuntimeConfig();
            // Assuming backend is proxied or available at /api/rates or http://localhost:PORT/rates
            // In this project, backend seems to be distinct. 
            // Need to check how API calls are made (fetch or $fetch via utility?).
            // Using standard fetch for now with relative path if proxy exists, or absolute.
            // Checking `sync.client.ts` earlier showed usages.
            // Assuming there is a configured $fetch or similar.

            // Construct URL
            const backendUrl = config.public.backendUrl;
            const url = `${backendUrl}/currency/rates?base=${base}`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                ratesData.value = data;
            }
        } catch (e) {
            console.error('Failed to fetch rates', e);
        } finally {
            loading.value = false;
        }
    }

    // Convert
    function convert(amount: number, fromCurrency: string, toCurrency: string): number {
        if (fromCurrency === toCurrency) return amount;

        // Safety check
        if (!ratesData.value || !ratesData.value.rates) return amount;

        // Check coverage
        const fromRate = ratesData.value.rates[fromCurrency];
        const toRate = ratesData.value.rates[toCurrency];

        if (!fromRate || !toRate) {
            // Fallback: 1:1 if missing rates (warn in console?)
            // preventing NaN
            return amount;
        }

        // Convert From -> Base (USD) -> To
        // Rates are "1 USD = X Currency" (if Base is USD)
        // Value in USD = Amount / FromRate
        // Value in To = (Amount / FromRate) * ToRate

        return (amount / fromRate) * toRate;
    }

    return {
        ratesData,
        loading,
        fetchRates,
        convert
    };
});
