<script lang="ts" setup>
import ImportQif from '~/components/backup/ImportQif.vue';
import ExportQif from '~/components/backup/ExportQif.vue';
</script>

<template>
  <div>
    <ImportQif />
    <ExportQif />

    <hr />
    <Stats />
    <hr />

    <Accounts />
    <hr />
    <Categories />
    <hr />
    <Transactions />
  </div>
</template>

<style scoped></style>
