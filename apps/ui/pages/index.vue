<script lang="ts" setup>
import ImportQif from '~/components/backup/ImportQif.vue';
import ExportQif from '~/components/backup/ExportQif.vue';
import AccountsList from '~/components/account/AccountsList.vue';
</script>

<template>
  <div>
    <Debug root="div">
      <ImportQif />
      <ExportQif />

      <hr />
      <Stats />
      <hr />
    </Debug>

    <AccountsList />
    <hr />
    <FooterButtons />

    <Debug root="div">
      <hr />
      <Categories />
      <hr />
      <ProjectList />
    </Debug>
  </div>
</template>

<style scoped></style>
