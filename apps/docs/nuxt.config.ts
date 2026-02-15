export default defineNuxtConfig({
    extends: 'docus',
    compatibilityDate: '2025-02-15',
    nitro: {
        prerender: {
            failOnError: false,
            ignore: [
                '/gustawdaniel/vault-track',
                '/raw/introduction/_dir.md',
                '/raw/files/_dir.md',
                '/raw/developer-guide/_dir.md'
            ]
        }
    }
})
