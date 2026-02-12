<script setup lang="ts">
import { useHead } from '#app';
// Google GSI is managed by vue3-google-login but we can also add it via head if needed.
// vue3-google-login plugin handles script injection.

useHead({
    // Head config moved to nuxt.config.ts
})
</script>

<template>
    <div class="antialiased text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-950 min-h-screen">
        <UContainer>
            <NuxtPage />
        </UContainer>
    </div>
</template>
