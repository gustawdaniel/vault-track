<script lang="ts" setup>
import { useRouter } from '#imports';
import type { MenuOption } from '~/components/menu/HoveredSelectableOptionsList.vue';
import HoveredSelectableOptionsList from '~/components/menu/HoveredSelectableOptionsList.vue';

const options: MenuOption[] = [
  {
    id: 'open-account',
    name: 'New Account',
    click: () => {
      const router = useRouter();
      router.push(`/account/new?edit=1`);
    },
  },
  {
    id: 'database',
    name: 'Database',
    click: () => {
      const router = useRouter();
      router.push(`/backup`);
    },
  },
  {
    id: 'preferences',
    name: 'Preferences',
    click: () => {
      const router = useRouter();
      router.push('/preferences');
    },
  },
];
</script>

<template>
  <UPopover>
    <slot />
    <template #panel>
      <HoveredSelectableOptionsList :options="options" />
    </template>
  </UPopover>
</template>

<style scoped></style>
