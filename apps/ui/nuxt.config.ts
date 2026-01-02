import tailwindcss from '@tailwindcss/vite';

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
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['legacy-encoding'],
    },
  },

  nitro: {
    prerender: {
      routes: ['/robots.txt'],
    },
    storage: {
      sync: process.env.NODE_ENV === 'production'
        ? {
          driver: 'redis',
          url: process.env.REDIS_URL || process.env.KV_URL,
        }
        : {
          driver: 'fs',
          base: '.data/sync',
        },
    },
  },
});
