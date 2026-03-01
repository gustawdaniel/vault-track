export function getBackendUrl(): string {
    // First check if a custom backend URL is saved in localStorage
    if (import.meta.client) {
        let customUrl = localStorage.getItem('ocm-custom-backend-url');
        if (customUrl) {
            customUrl = customUrl.trim();

            // Ensure the URL is absolute to prevent Nuxt $fetch from treating it as a relative path
            if (!/^https?:\/\//i.test(customUrl)) {
                // Default to https, unless it's obviously a local IP/localhost
                if (customUrl.startsWith('localhost') || customUrl.startsWith('127.0.0.1') || customUrl.startsWith('192.168.')) {
                    customUrl = 'http://' + customUrl;
                } else {
                    customUrl = 'https://' + customUrl;
                }
            }

            // Remove trailing slash if user added it
            customUrl = customUrl.replace(/\/$/, '');

            // Auto append /api if it's missing
            if (!customUrl.endsWith('/api')) {
                customUrl += '/api';
            }

            return customUrl;
        }
    }

    // Fallback to Nuxt config default
    const config = useRuntimeConfig();
    return config.public.backendUrl as string;
}
