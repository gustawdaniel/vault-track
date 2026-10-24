<script lang="ts" setup>
import { useRoute } from '#imports';
import { useProjectStore } from '~/store/project';
import SingleProjectEdit from '~/components/project/SingleProjectEdit.vue';

const NEW_PROJECT_ID = 'new';
const route = useRoute();
const projectId: string = String(route.params.id);
const projectStore = useProjectStore();
const project =
  projectId === NEW_PROJECT_ID
    ? projectStore.getNew()
    : projectStore.getById(projectId);
</script>

<template>
  <div v-if="project">
    <SingleProjectEdit :project="project" />
  </div>
  <div>
    <p>Project {{ projectId }} not found</p>
  </div>
</template>

<style scoped></style>
