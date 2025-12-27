import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: false },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/robots', '@nuxt/eslint'],

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
  },
});
