<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRuntimeConfig, useRouter } from '#app';
import { getBackendUrl } from '~/utils/backendUrl';

const users = ref<any[]>([]);
const loadingUsers = ref(false);
const usersError = ref('');
const config = useRuntimeConfig();
const router = useRouter();

// Edit Modal State
const isEditModalOpen = ref(false);
const editingUser = ref<any>(null);
const editCreditsValue = ref(0);
const savingCredits = ref(false);

// Query State
const sqlQuery = ref('SELECT * FROM users LIMIT 10');
const queryResult = ref<any>(null);
const queryError = ref('');
const loadingQuery = ref(false);

const activeTab = ref(0);

const items = [
    { label: 'Users', slot: 'users' },
    { label: 'SQL Console', slot: 'sql' },
];

const fetchUsers = async () => {
    loadingUsers.value = true;
    usersError.value = '';
    try {
        const backendUrl = getBackendUrl();
        const token = import.meta.client ? localStorage.getItem('ocm-admin-token') : null;
        const data: any = await $fetch(`${backendUrl}/users`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        users.value = data;
    } catch (e: any) {
        if (e.response?.status === 401 || e.response?.status === 403) {
            router.push('/login');
        } else {
            usersError.value = e.data?.error || e.message || 'Failed to fetch users';
        }
    } finally {
        loadingUsers.value = false;
    }
};

const openEditModal = (user: any) => {
    editingUser.value = user;
    editCreditsValue.value = user.credits;
    isEditModalOpen.value = true;
};

const saveCredits = async () => {
    if (!editingUser.value) return;

    savingCredits.value = true;
    try {
        const backendUrl = getBackendUrl();
        const token = import.meta.client ? localStorage.getItem('ocm-admin-token') : null;
        await $fetch(`${backendUrl}/users/${editingUser.value.id}/credits`, {
            method: 'PUT',
            body: { credits: editCreditsValue.value },
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        isEditModalOpen.value = false;
        await fetchUsers(); // Refresh list
    } catch (e: any) {
        alert(e.data?.error || 'Failed to update credits');
    } finally {
        savingCredits.value = false;
    }
};

const executeQuery = async () => {
    loadingQuery.value = true;
    queryError.value = '';
    queryResult.value = null;

    try {
        const backendUrl = getBackendUrl();
        const token = import.meta.client ? localStorage.getItem('ocm-admin-token') : null;
        const res: any = await $fetch(`${backendUrl}/admin/query`, {
            method: 'POST',
            body: { query: sqlQuery.value },
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        queryResult.value = res;
    } finally {
        loadingQuery.value = false;
    }
};

const logout = async () => {
    try {
        const backendUrl = getBackendUrl();
        const token = import.meta.client ? localStorage.getItem('ocm-admin-token') : null;
        await $fetch(`${backendUrl}/admin/logout`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (import.meta.client) {
            localStorage.removeItem('ocm-admin-token');
        }
        router.push('/login');
    } catch (e) {
        console.error('Logout failed', e);
        router.push('/login');
    }
};

onMounted(() => {
    fetchUsers();
});
</script>

<template>
    <div class="container mx-auto p-6 max-w-6xl">
        <div class="flex flex-col gap-2 mb-6">
            <div class="flex justify-between items-center">
                <h1 class="text-2xl font-bold">Admin Dashboard</h1>
                <UButton @click="logout" variant="ghost" color="red" icon="i-heroicons-arrow-right-start-on-rectangle">
                    Logout</UButton>
            </div>
            <div class="flex justify-end items-center gap-2 text-xs text-gray-500 border-b pb-2">
                <span>Backend URL: <code
                        class="bg-gray-100 px-1 py-0.5 rounded text-blue-600">{{ getBackendUrl() }}</code></span>
                <UButton size="2xs" variant="ghost" color="gray" icon="i-heroicons-pencil-square" to="/login"
                    title="Go to login page to change backend settings" />
            </div>
        </div>

        <UTabs :items="items" v-model="activeTab" class="w-full">
            <template #users="{ item }">
                <UCard>
                    <template #header>
                        <div class="flex justify-between items-center">
                            <h2 class="text-lg font-semibold">User Management</h2>
                            <UButton @click="fetchUsers" icon="i-heroicons-arrow-path" variant="ghost" />
                        </div>
                    </template>

                    <div v-if="loadingUsers" class="flex justify-center p-8">
                        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl" />
                    </div>

                    <div v-else-if="usersError" class="text-red-500 p-4 bg-red-50 rounded">
                        {{ usersError }}
                        <br />
                        <UButton size="xs" variant="link" to="/login">Go to Login Page</UButton>
                    </div>

                    <UTable v-else :columns="[
                        { header: 'ID', accessorKey: 'id', key: 'id', id: 'id' },
                        { header: 'Email', accessorKey: 'email', key: 'email', id: 'email' },
                        { header: 'Credits', accessorKey: 'credits', key: 'credits', id: 'credits' },
                        { header: 'Events', accessorKey: 'event_count', key: 'event_count', id: 'event_count' },
                        { header: 'Created At', accessorKey: 'created_at', key: 'created_at', id: 'created_at' },
                        { header: 'Actions', key: 'actions', id: 'actions' },
                    ]" :data="users">
                        <template #id-cell="{ row }">
                            <span class="font-mono text-xs select-all break-all" :title="row.original.id">
                                {{ row.original.id }}
                                <UButton icon="i-heroicons-clipboard" size="2xs" variant="ghost" color="gray"
                                    class="ml-1" @click="navigator.clipboard.writeText(row.original.id)" />
                            </span>
                        </template>

                        <template #credits-cell="{ row }">
                            <span
                                class="font-mono font-bold cursor-pointer hover:text-primary-500 underline decoration-dashed"
                                @click="openEditModal(row.original)" title="Click to edit">
                                {{ row.original.credits }}
                            </span>
                        </template>

                        <template #actions-cell="{ row }">
                            <UButton size="xs" color="primary" variant="solid" icon="i-heroicons-pencil-square"
                                @click="openEditModal(row.original)">
                                Edit
                            </UButton>
                        </template>
                    </UTable>

                    <div v-if="users.length === 0 && !loadingUsers && !usersError"
                        class="text-center p-8 text-gray-500">
                        No users found.
                    </div>
                </UCard>
            </template>

            <template #sql="{ item }">
                <UCard>
                    <template #header>
                        <h2 class="text-lg font-semibold">SQL Query Console</h2>
                    </template>

                    <div class="space-y-4">
                        <UTextarea v-model="sqlQuery" :rows="5" placeholder="Enter SQL Query..."
                            font-family="monospace" />
                        <div class="flex justify-end">
                            <UButton label="Execute" @click="executeQuery" :loading="loadingQuery" color="black" />
                        </div>

                        <div v-if="queryError" class="p-4 bg-red-50 text-red-600 rounded whitespace-pre-wrap">
                            {{ queryError }}
                        </div>

                        <div v-if="queryResult" class="overflow-x-auto">
                            <p v-if="queryResult.error" class="text-red-500 mb-2 font-bold">
                                Error: {{ queryResult.error }}
                            </p>
                            <div v-else>
                                <div class="mb-2 text-sm text-gray-500">
                                    {{ queryResult.rows?.length || 0 }} rows returned
                                </div>
                                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border">
                                    <thead class="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th v-for="col in queryResult.columns" :key="col"
                                                class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                                                {{ col }}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody
                                        class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        <tr v-for="(row, idx) in queryResult.rows" :key="idx">
                                            <td v-for="col in queryResult.columns" :key="col"
                                                class="px-3 py-2 whitespace-nowrap text-sm border-r">
                                                {{ row[col] }}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </UCard>
            </template>
        </UTabs>

        <!-- Edit Modal moved outside UTabs -->
        <!-- Edit Modal moved outside UTabs -->
        <UModal v-model:open="isEditModalOpen" title="Edit Credits"
            description="Update the credit balance for this user.">
            <template #body>
                <div v-if="editingUser" class="space-y-4">
                    <p class="text-sm text-gray-500">
                        User ID: <span class="font-mono text-gray-700 dark:text-gray-300">{{ editingUser.id }}</span>
                    </p>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Credits</label>
                        <UInput type="number" v-model.number="editCreditsValue" />
                    </div>
                </div>
            </template>

            <template #footer>
                <UButton color="gray" variant="ghost" @click="isEditModalOpen = false">Cancel</UButton>
                <UButton color="primary" @click="saveCredits" :loading="savingCredits">Save</UButton>
            </template>
        </UModal>
    </div>
</template>
