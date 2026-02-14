<script lang="ts" setup>
import { useDialog } from '~/store/dialog';
import { useAssertStore } from '~/store/assert';
import AssertForm from '~/components/assert/AssertForm.vue';

interface AssertData {
    id?: string;
    accountId: string;
    date: string;
    value: number;
}

const props = defineProps<{
    initialData: AssertData;
}>();

const dialog = useDialog();
const assertStore = useAssertStore();
const toast = useToast();

async function onSubmit(data: any) {
    if (props.initialData.id) {
        assertStore.update(props.initialData.id, data);
        toast.add({ title: 'Assert updated' });
    } else {
        assertStore.create({
            accountId: props.initialData.accountId,
            ...data
        });
        toast.add({ title: 'Assert created' });
    }
    dialog.closeDialog();
}

function cancel() {
    dialog.closeDialog();
}
</script>

<template>
    <div class="p-4">
        <h3 class="text-lg font-bold mb-4">{{ initialData.id ? 'Edit Assert' : 'Create Assert' }}</h3>
        <AssertForm :model-value="initialData" @submit="onSubmit" />
        <div class="mt-4 text-right">
            <UButton variant="ghost" color="neutral" @click="cancel">Cancel</UButton>
        </div>
    </div>
</template>
