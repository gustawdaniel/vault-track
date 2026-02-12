<script lang="ts" setup>

import type { MenuOption } from '~/components/menu/HoveredSelectableOptionsList.vue';
import HoveredSelectableOptionsList from '~/components/menu/HoveredSelectableOptionsList.vue';

const options: MenuOption[] = [
  {
    id: 'open-account',
    name: 'New Account',
    to: '/account/new?edit=1'
  },
  {
    id: 'database',
    name: 'Database',
    to: '/backup'
  },
  {
    id: 'preferences',
    name: 'Preferences',
    to: '/preferences'
  },
];
</script>

<template>
  <UPopover>
    <slot />
    <template #content>
      <HoveredSelectableOptionsList :options="options" />
    </template>
  </UPopover>
</template>

<style scoped></style>
