import { getBackendUrl } from '~/utils/backendUrl';

export default defineNuxtRouteMiddleware(async (to, from) => {
    // Skip if already on login page
    if (to.path === '/login') return;

    try {
        const backendUrl = getBackendUrl();

        // Check dedicated auth status endpoint
        const token = import.meta.client ? localStorage.getItem('ocm-admin-token') : null;
        const { loggedIn } = await $fetch<{ loggedIn: boolean }>(`${backendUrl}/admin/me`, {
            headers: {
                'Accept': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
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
