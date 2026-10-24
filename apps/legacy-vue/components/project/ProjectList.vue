<script lang="ts" setup>
import { useProjectStore } from '~/store/project';

const projectStore = useProjectStore();
</script>

<template>
  <ul>
    <li v-for="project of projectStore.projects" :key="project.project">
      {{ project.project }}
    </li>
  </ul>
</template>

<style scoped></style>
