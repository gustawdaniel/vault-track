export default defineNuxtConfig({
    extends: 'docus',
    compatibilityDate: '2025-02-15',
    image: {
        provider: 'none',
    },
    alias: {
        'zod': 'zod',
        'zod/package.json': 'zod/package.json'
    },
    nitro: {
        preset: 'static',
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
