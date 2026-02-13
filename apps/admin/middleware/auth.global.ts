export default defineNuxtRouteMiddleware(async (to, from) => {
    // Skip if already on login page
    if (to.path === '/login') return;

    const config = useRuntimeConfig();

    try {
        // Simple check if user is authenticated via backend
        // We can check /api/admin/me or similar, but for now we rely on the users fetch failing or succeeding.
        // However, middleware runs before page load.
        // Let's try to fetch a lightweight endpoint or check if we have a way to know auth status.
        // Since we use httpOnly cookies, we must make a request to know.

        // Check dedicated auth status endpoint
        const { loggedIn } = await $fetch<{ loggedIn: boolean }>(`${config.public.backendUrl}/admin/me`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (!loggedIn) {
            return navigateTo('/login');
        }
    } catch (e: any) {
        // Network error or other failure
        console.error('Auth check failed', e);
        return navigateTo('/login');
    }
});
