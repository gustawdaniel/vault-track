import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
    modules: ['@nuxt/ui'],
    css: ['~/assets/css/main.css'],
    build: {
        transpile: ['vue3-google-login']
    },
    sourcemap: {
        client: true,
        server: false
    },
    vite: {
        plugins: [
            tailwindcss(),
        ],
        resolve: {
            dedupe: ['vue']
        }
    },
    runtimeConfig: {
        public: {
            googleClientId: process.env.GOOGLE_CLIENT_ID || '244384199602-sqhor9mc08tkl3gkd71k9c46rq38msdd.apps.googleusercontent.com',
            backendUrl: process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://api.vaulttrack.org/api' : 'http://localhost:4500/api'),
        }
    },
    ssr: false, // SPA is fine for internal admin
    devtools: { enabled: true },
    compatibilityDate: '2026-01-02',
    app: {
        head: {
            title: 'Admin - Open Cash Manager',
            meta: [
                { name: 'viewport', content: 'width=device-width, initial-scale=1' }
            ],
            link: [
                { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
                { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
                { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }
            ]
        }
    },
    routeRules: {
        '/**': {
            headers: {
                'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
            }
        }
    }
})
