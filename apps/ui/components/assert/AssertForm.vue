<script lang="ts" setup>
import { z } from 'zod';
import type { FormSubmitEvent } from '#ui/types';

const props = defineProps<{
    modelValue?: {
        id?: string;
        date: string;
        value: number;
    };
}>();

const emit = defineEmits(['submit']);

const schema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date (YYYY-MM-DD)'),
    value: z.number()
});

type Schema = z.output<typeof schema>;

const state = reactive({
    date: props.modelValue?.date || new Date().toISOString().split('T')[0],
    value: props.modelValue?.value || 0
});

watch(() => props.modelValue, (val) => {
    if (val) {
        state.date = val.date;
        state.value = val.value;
    }
}, { deep: true });

async function onSubmit(event: FormSubmitEvent<Schema>) {
    emit('submit', event.data);
}
</script>

<template>
    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Date" name="date">
            <UInput type="date" v-model="state.date" />
        </UFormField>

        <UFormField label="Expected Balance" name="value">
            <div class="flex items-center gap-2">
                <UInput type="number" step="0.01" v-model.number="state.value" class="flex-grow" />
            </div>
        </UFormField>

        <div class="flex justify-end gap-2">
            <UButton type="submit" label="Save Assert" color="primary" />
        </div>
    </UForm>
</template>
