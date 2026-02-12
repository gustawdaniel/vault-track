import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
    modules: ['@nuxt/ui'],
    css: ['~/assets/css/main.css'],
    vite: {
        plugins: [
            tailwindcss(),
        ],
        resolve: {
            dedupe: ['vue']
        }
    },
    compatibilityDate: '2026-02-12',
    runtimeConfig: {
        public: {
            googleClientId: process.env.GOOGLE_CLIENT_ID || '244384199602-sqhor9mc08tkl3gkd71k9c46rq38msdd.apps.googleusercontent.com',
            backendUrl: process.env.BACKEND_URL || 'http://localhost:4500/api',
        }
    },
    ssr: false, // SPA is fine for internal admin
    devtools: { enabled: true }
})
