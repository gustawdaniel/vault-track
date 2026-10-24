<template>
  <AppContainer>
    <UCard class="mt-8 max-w-2xl mx-auto">
      <template #header>
        <h2 class="text-xl font-bold">Backend Configuration</h2>
      </template>

      <div class="space-y-6">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
          If you are self-hosting your VaultTrack synchronization node, enter your server's API address below (e.g.,
          <code>https://mydomain.com/api</code> or <code>http://localhost:4500/api</code>).
        </p>
        <p class="text-xs text-gray-500 mb-4">
          Leave this blank to use the official hosted service.
        </p>

        <UFormGroup label="Backend API URL" class="mb-4">
          <UInput v-model="customUrlInput" placeholder="http://192.168.1.100:4500/api" icon="i-heroicons-link" class="w-full mb-3"/>
        </UFormGroup>

        <div class="p-4 bg-gray-50 rounded-md border text-sm">
          <strong>Current Active URL:</strong>
          <code class="ml-2 px-2 py-1 bg-gray-100 rounded break-all text-blue-600">{{ activeBackendUrl }}</code>
        </div>

        <div class="mt-6 flex justify-between items-center">
          <UButton color="neutral" variant="ghost" @click="clearCustomUrl">
            Restore Default
          </UButton>
          <UButton color="primary" @click="saveCustomUrl" :disabled="!isChanged">
            Save Configuration
          </UButton>
        </div>
      </div>
    </UCard>
  </AppContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToast } from '#imports';
import AppContainer from '~/components/shared/AppContainer.vue';
import { getBackendUrl } from '~/utils/backendUrl';

const toast = useToast();
const customUrlInput = ref('');
const savedCustomUrl = ref('');

const activeBackendUrl = computed(() => {
  return getBackendUrl();
});

const isChanged = computed(() => {
  return customUrlInput.value !== savedCustomUrl.value;
});

onMounted(() => {
  if (import.meta.client) {
    const existing = localStorage.getItem('ocm-custom-backend-url') || '';
    customUrlInput.value = existing;
    savedCustomUrl.value = existing;
  }
});

function saveCustomUrl() {
  if (import.meta.client) {
    let urlToSave = customUrlInput.value.trim();

    // Ensure the URL is absolute
    if (urlToSave && !/^https?:\/\//i.test(urlToSave)) {
      if (urlToSave.startsWith('localhost') || urlToSave.startsWith('127.0.0.1') || urlToSave.startsWith('192.168.')) {
        urlToSave = 'http://' + urlToSave;
      } else {
        urlToSave = 'https://' + urlToSave;
      }
    }

    if (urlToSave && urlToSave.endsWith('/')) {
      urlToSave = urlToSave.slice(0, -1);
    }

    // Auto append /api if it's missing
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

    savedCustomUrl.value = urlToSave;
    // Force a small reload or state update to refresh the computed value properly
    // though getBackendUrl is not reactive if it just reads from localStorage directly.
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }
}

function clearCustomUrl() {
  customUrlInput.value = '';
  saveCustomUrl();
}
</script>
