<script lang="ts" setup>
import { PlusSmallIcon } from '@heroicons/vue/20/solid';

const navigation = [
  { name: 'Documentation', href: '#' },
  { name: 'Community', href: '#' },
  { name: 'Support', href: '/guide' },
  {
    name: 'New transaction',
    to: '/transaction/new',
    featured: true,
    icon: PlusSmallIcon,
  },
];

const selectedAccountId = ref<string | undefined>();

function setSelectedAccountId(id: string) {
  selectedAccountId.value = id;
}
</script>

<template>
  <header
    class="absolute inset-x-0 top-0 z-50 flex h-16 border-b border-gray-900/10"
  >
    <div
      class="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
    >
      <div class="flex flex-1 items-center gap-x-6"></div>
      <nav
        class="items-center hidden md:flex md:gap-x-11 md:text-sm md:font-semibold md:leading-6 md:text-gray-700"
      >
        <!--        TODO: place for search bar -->
        <NuxtLink
          v-for="(item, itemIdx) in navigation"
          :key="itemIdx"
          :class="
            item.featured
              ? 'rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
              : ''
          "
          :to="item.to"
          class="flex items-center"
        >
          <component :is="item.icon" v-if="item.icon" class="w-6 h-6 mr-2" />
          {{ item.name }}
        </NuxtLink>
      </nav>
    </div>
  </header>

  <hr />

  <DesktopAccoutsList @select-account-id="setSelectedAccountId" />
  <!-- Activity feed -->
  <DesktopTransactionsList :filter="{ accountId: selectedAccountId }" />
</template>
