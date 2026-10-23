export default defineNuxtConfig({
    extends: 'docus',
    compatibilityDate: '2025-02-15',
    site: {
        url: 'https://docs.vaulttrack.org',
    },
    image: {
        provider: 'none',
    },
    nitro: {
        preset: 'static',
        prerender: {
            failOnError: false,
            ignore: [
                '/raw/introduction/_dir.md',
                '/raw/files/_dir.md',
                '/raw/developer-guide/_dir.md'
            ]
        }
    }
})
