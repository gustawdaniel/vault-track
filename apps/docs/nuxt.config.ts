export default defineNuxtConfig({
  // https://github.com/nuxt-themes/docus
  // @ts-expect-error Types for docus theme are not fully compatible with Nuxt 3 types yet
  extends: '@nuxt-themes/docus',
  devtools: { enabled: true },

  modules: [
    // Remove it if you don't use Plausible analytics
    // https://github.com/nuxt-modules/plausible
    '@nuxtjs/plausible',
    '@nuxt/eslint',
  ],
});
