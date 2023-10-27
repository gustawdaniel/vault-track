<script lang="ts" setup>
import { useWindowSize } from '@vueuse/core';
import ImportQif from '~/components/backup/ImportQif.vue';
import ExportQif from '~/components/backup/ExportQif.vue';
import AccountsList from '~/components/account/AccountsList.vue';

import { hasAppAnySavedData } from '~/utils/hasAppAnySavedData';

const isEmpty = computed<boolean>(() => {
  return !hasAppAnySavedData();
});

const { width } = useWindowSize();
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

    <div v-if="isEmpty">
      <LandingPage />
    </div>
    <div v-else>
      <DesktopMainView v-if="width > 768" />

      <div v-else-if="width <= 768">
        <AccountsList />
        <hr />
        <FooterButtons />
      </div>
    </div>

    <Debug root="div">
      <hr />
      <Categories />
      <hr />
      <ProjectList />
    </Debug>
  </div>
</template>

<style scoped></style>
