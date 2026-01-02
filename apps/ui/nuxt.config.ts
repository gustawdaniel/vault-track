import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: false },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/robots', '@nuxt/eslint'],
  sourcemap: {
    client: true,
    server: false
  },

  colorMode: {
    preference: 'light',
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [
      tailwindcss(),
      nodePolyfills({
        include: ['buffer', 'stream', 'util'],
        globals: {
          Buffer: true,
        },
      }),
    ],
    optimizeDeps: {
      include: ['legacy-encoding', 'bip39'],
    },
  },

  nitro: {
    prerender: {
      routes: ['/robots.txt'],
    },
    storage: {
      sync: process.env.REDIS_URL
        ? {
          driver: 'redis',
          url: process.env.REDIS_URL
        }
        : {
          driver: 'fs',
          base: '.data/sync'
        }
    }

  },
  compatibilityDate: '2026-01-02',
});
