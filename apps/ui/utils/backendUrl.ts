export function getBackendUrl(): string {
    // First check if a custom backend URL is saved in localStorage
    if (import.meta.client) {
        const customUrl = localStorage.getItem('ocm-custom-backend-url');
        if (customUrl) {
            // Remove trailing slash if user added it
            return customUrl.replace(/\/$/, '');
        }
    }

    // Fallback to Nuxt config default
    const config = useRuntimeConfig();
    return config.public.backendUrl as string;
}
