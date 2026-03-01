<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useRuntimeConfig } from '#app';
import { getBackendUrl } from '~/utils/backendUrl';
import { useToast } from '#imports';

const toast = useToast();
const customUrlInput = ref('');
const isCustomUrlExpanded = ref(false);

onMounted(() => {
    if (import.meta.client) {
        customUrlInput.value = localStorage.getItem('ocm-custom-backend-url') || '';
    }
});

function saveCustomUrl() {
    if (import.meta.client) {
        let urlToSave = customUrlInput.value.trim();

        // Ensure the URL is absolute to prevent Nuxt $fetch from treating it as a relative path
        if (urlToSave && !/^https?:\/\//i.test(urlToSave)) {
            // Default to https, unless it's obviously a local IP/localhost
            if (urlToSave.startsWith('localhost') || urlToSave.startsWith('127.0.0.1') || urlToSave.startsWith('192.168.')) {
                urlToSave = 'http://' + urlToSave;
            } else {
                urlToSave = 'https://' + urlToSave;
            }
        }

        if (urlToSave && urlToSave.endsWith('/')) {
            urlToSave = urlToSave.slice(0, -1);
        }

        // Auto append /api if it's missing (assuming the user means the backend API root)
        if (urlToSave && !urlToSave.endsWith('/api')) {
            urlToSave += '/api';
        }

        customUrlInput.value = urlToSave;

        if (urlToSave) {
            localStorage.setItem('ocm-custom-backend-url', urlToSave);
            toast.add({
                title: 'Backend URL updated',
                description: 'Requests will now go to ' + urlToSave,
                color: 'success'
            });
        } else {
            localStorage.removeItem('ocm-custom-backend-url');
            toast.add({
                title: 'Backend URL restored',
                description: 'Requests will now go to the default server',
                color: 'success'
            });
        }
    }
}

const config = useRuntimeConfig();
const router = useRouter();
const loading = ref(false);
const error = ref('');

const callback = async (response) => {
    loading.value = true;
    error.value = '';

    try {
        const { credential } = response;

        const backendUrl = getBackendUrl();
        const res: any = await $fetch(`${backendUrl}/admin/login`, {
            method: 'POST',
            body: { token: credential },
        });

        if (res.success && res.token) {
            if (import.meta.client) {
                localStorage.setItem('ocm-admin-token', res.token);
            }
            router.push('/');
        } else {
            console.log(res);
            error.value = 'Login failed';
        }
    } catch (e: any) {
        error.value = e.data?.error || 'Login failed';
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <UCard class="w-full max-w-md">
            <template #header>
                <h1 class="text-xl font-bold text-center">Admin Login</h1>
            </template>

            <div class="flex flex-col items-center gap-4 py-4">
                <ClientOnly>
                    <GoogleLogin :callback="callback" />
                </ClientOnly>

                <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
            </div>

            <template #footer>
                <div class="flex flex-col items-center gap-2">
                    <UButton color="gray" variant="ghost" size="xs" icon="i-heroicons-cog-6-tooth"
                        @click="isCustomUrlExpanded = !isCustomUrlExpanded">
                        Advanced Settings (Self Hosting)
                    </UButton>

                    <div v-if="isCustomUrlExpanded"
                        class="w-full mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-left">
                        <UFormGroup label="Custom Backend URL"
                            help="Leave blank for vaulttrack.org. E.g. mydomain.com -> https://mydomain.com/api"
                            size="sm" class="w-full">
                            <UInput v-model="customUrlInput" placeholder="http://localhost:4500" class="w-full" />
                        </UFormGroup>
                        <div class="mt-2 flex justify-end">
                            <UButton size="xs" color="black" @click="saveCustomUrl">Save</UButton>
                        </div>
                    </div>
                </div>
                <p class="text-xs text-center text-gray-500 mt-4">Only authorized accounts can access.</p>
            </template>
        </UCard>
    </div>
</template>
