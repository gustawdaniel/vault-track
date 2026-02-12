<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRuntimeConfig, useRouter } from '#app';

const users = ref([]);
const loadingUsers = ref(false);
const usersError = ref('');
const config = useRuntimeConfig();
const router = useRouter();

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
        const data = await $fetch(`${config.public.backendUrl}/users`, {
            credentials: 'include',
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

const updateCredits = async (userId: string, newCredits: number) => {
    try {
        await $fetch(`${config.public.backendUrl}/users/${userId}/credits`, {
            method: 'PUT',
            body: { credits: newCredits },
            credentials: 'include',
        });
        await fetchUsers(); // Refresh
    } catch (e: any) {
        alert(e.data?.error || 'Failed to update credits');
    }
};

const executeQuery = async () => {
    loadingQuery.value = true;
    queryError.value = '';
    queryResult.value = null;

    try {
        const res: any = await $fetch(`${config.public.backendUrl}/admin/query`, {
            method: 'POST',
            body: { query: sqlQuery.value },
            credentials: 'include',
        });
        queryResult.value = res;
    } finally {
        loadingQuery.value = false;
    }
};

const logout = async () => {
    try {
        await $fetch(`${config.public.backendUrl}/admin/logout`, {
            method: 'POST',
            credentials: 'include',
        });
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
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-2xl font-bold">Admin Dashboard</h1>
            <UButton @click="logout" variant="ghost" color="red" icon="i-heroicons-arrow-right-start-on-rectangle">
                Logout</UButton>
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
                        { header: 'Created At', accessorKey: 'created_at', key: 'created_at', id: 'created_at' },
                        { header: 'Actions', key: 'actions', id: 'actions' },
                    ]" :data="users">
                        <template #id-data="{ row }">
                            <span class="font-mono text-xs" :title="row.id">
                                {{ row.id.substring(0, 8) }}...{{ row.id.substring(row.id.length - 8) }}
                                <UButton icon="i-heroicons-clipboard" size="2xs" variant="ghost" color="gray"
                                    class="ml-1" @click="navigator.clipboard.writeText(row.id)" />
                            </span>
                        </template>

                        <template #credits-data="{ row }">
                            <span class="font-mono font-bold">{{ row.credits }}</span>
                        </template>

                        <template #actions-data="{ row }">
                            <div class="flex items-center gap-2">
                                <UInput type="number" v-model.number="row.newCredits" placeholder="Set" class="w-20"
                                    size="xs" />
                                <UButton size="xs" color="primary" variant="soft" @click="
                                    updateCredits(
                                        row.id,
                                        row.newCredits !== undefined
                                            ? row.newCredits
                                            : row.credits,
                                    )
                                    " :disabled="row.newCredits === undefined">
                                    Save
                                </UButton>
                            </div>
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
    </div>
</template>
