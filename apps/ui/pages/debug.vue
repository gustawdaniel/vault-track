<script setup lang="ts">
  import { useCategoryStore } from '~/store/category';
  import { useDialog } from '~/store/dialog';
import ConfirmDelete from '~/components/dialog/ConfirmDelete.vue';

const items = ref(['Backlog', 'Todo', 'In Progress', 'Done'])
const value = ref('Backlog')

const categoryStore = useCategoryStore();

const dialog = useDialog(); // Hoist dialog controller

function openModal() {
  console.log('openModal');
           dialog.openDialog(ConfirmDelete, {
              resource: 'category',
              id: '6ebddb35a1b',
            });
}
</script>

<template>
  <div class="p-4">
    <UButton label="Open" color="neutral" variant="subtle" @click="openModal" />

    <USelectMenu v-model="value" :items="items" />
    <p>Selected: {{ value }}</p>
    <pre>{{ categoryStore.categories }}</pre>
    
    <!-- <dialog-root /> -->


  <!-- <UModal v-model:open="dialog.isDialogOpen">
    <UButton label="Open" color="neutral" variant="subtle" />

    <template #content>
      <div class="h-48 m-4" />
    </template>
  </UModal> -->

  </div>
</template>
