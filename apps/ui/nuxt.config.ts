export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/robots'],
  buildModules: ['@nuxtjs/pwa'],
  colorMode: {
    preference: 'light',
  },
});
