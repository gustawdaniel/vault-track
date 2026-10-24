<script lang="ts" setup>
import ImportQif from '~/components/backup/ImportQif.vue';
import ExportQif from '~/components/backup/ExportQif.vue';
import ClearAllData from '~/components/backup/ClearAllData.vue';
import { hasAppAnySavedData } from '~/utils/hasAppAnySavedData';

const hasData = computed<boolean>(() => {
  return hasAppAnySavedData();
});
</script>

<template>
  <div>
    <Stats />
    <ImportQif />
    <ExportQif v-if="hasData" />
    <ClearAllData v-if="hasData" />
  </div>
</template>

<style scoped></style>
