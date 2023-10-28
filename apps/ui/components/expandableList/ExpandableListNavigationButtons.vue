<script lang="ts" setup>
import { PlusIcon } from '@heroicons/vue/20/solid';
import type { ExpandableListResourceName } from '~/components/expandableList/types';

defineProps<{ resource: ExpandableListResourceName }>();
</script>

<template>
  <div class="flex items-center">
    <div class="flex-shrink-0">
      <NuxtLink
        :to="`/${resource}/new`"
        class="relative inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        type="button"
      >
        <PlusIcon aria-hidden="true" class="-ml-0.5 h-5 w-5" />
        New {{ ucFirst(resource) }}
      </NuxtLink>
    </div>
  </div>
</template>
