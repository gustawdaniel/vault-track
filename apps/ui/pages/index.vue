<script lang="ts" setup>
import ImportQif from '~/components/backup/ImportQif.vue';
import ExportQif from '~/components/backup/ExportQif.vue';
import AccountsList from '~/components/account/AccountsList.vue';
</script>

<template>
  <div>
    <ImportQif />
    <ExportQif />

    <hr />
    <Stats />
    <hr />

    <AccountsList />
    <hr />
    <Categories />
    <hr />
    <ProjectList />
  </div>
</template>

<style scoped></style>
