<script lang="ts" setup>
import { Disclosure } from '@headlessui/vue';
import { useRoute } from '#app';
import ExpandableListNavigationButtons from '~/components/expandableList/ExpandableListNavigationButtons.vue';
import { useDialog } from '~/store/dialog';
import { useAccountStore } from '~/store/account';

const route = useRoute();

const routeName = computed<string>(() => {
  const words = route.path.split('/');
  if (words[words.length - 1] === 'new') {
    words.reverse();
  }
  return ucFirst(words.join(' ').trim()) || 'VaultTrack';
});

useHead({
  htmlAttrs: {
    lang: 'en',
  },
  title: routeName.value,
  meta: [
    {
      name: 'description',
      content:
        'Take control over your personal finance. Save income, expenses and transfers in many currencies, understand how to optimize your spending. For free, using open source, without sharing your data with anyone.',
    },
  ],
});

const dialog = useDialog();
const accountStore = useAccountStore();
</script>

<template>
  <div>
    <Disclosure as="nav" class="bg-white shadow">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 justify-between">
          <NuxtLink class="flex" to="/">
            <div class="flex flex-shrink-0 items-center">
              <img height="10" width="10" alt="Logo" class="h-8 w-auto" src="/icon.png" />
              <p class="ml-5">{{ routeName }}</p>
            </div>
          </NuxtLink>

          <ExpandableListNavigationButtons v-if="route.path === '/categories'" resource="category" />
          <ExpandableListNavigationButtons v-if="route.path === '/projects'" resource="project" />

          <div v-if="route.path === '/'" class="flex items-center">
            <UButton :icon="accountStore.showHidden ? 'i-heroicons-eye-20-solid' : 'i-heroicons-eye-slash-20-solid'"
              color="neutral" variant="ghost" @click="accountStore.toggleShowHidden()" />
          </div>

          <div class="flex items-center ml-2">
            <UButton to="/settings/sync" icon="i-heroicons-arrow-path" color="neutral" variant="ghost" />
          </div>
        </div>
      </div>
    </Disclosure>

    <slot />

    <!-- <UModal v-model:open="dialog.isDialogOpen">
      <component :is="dialog.dialogComponent" v-bind="dialog.dialogProps" />
    </UModal> -->
  </div>
</template>

<style scoped></style>
