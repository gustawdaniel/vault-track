export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-02-02',
  devtools: { enabled: false },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/robots'],
  buildModules: ['@nuxtjs/pwa'],
  colorMode: {
    preference: 'light',
  },
  pwa: {
    manifest: {
      name: 'Open Cash App',
      lang: 'en',
      useWebmanifestExtension: false,
    },
  },
});
