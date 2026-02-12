<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useRuntimeConfig } from '#app';
// import { googleOneTap } from "vue3-google-login"

const config = useRuntimeConfig();
const router = useRouter();
const loading = ref(false);
const error = ref('');

const callback = async (response) => {
    loading.value = true;
    error.value = '';

    try {
        const { credential } = response;

        const res = await $fetch(`${config.public.backendUrl}/admin/login`, {
            method: 'POST',
            body: { token: credential },
            credentials: 'include', // Important for setting cookie
        });

        if (res.success) {
            router.push('/');
        } else {
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
                <p class="text-xs text-center text-gray-500">Only authorized accounts can access.</p>
            </template>
        </UCard>
    </div>
</template>
