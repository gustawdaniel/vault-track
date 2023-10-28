<script lang="ts" setup>
import { Disclosure } from '@headlessui/vue';
import { useRoute } from '#app';
import ExpandableListNavigationButtons from '~/components/expandableList/ExpandableListNavigationButtons.vue';

const route = useRoute();

const routeName = computed<string>(() => {
  const words = route.path.split('/');
  if (words[words.length - 1] === 'new') {
    words.reverse();
  }
  return ucFirst(words.join(' ').trim()) || 'Open Cash Manager';
});

useHead({
  htmlAttrs: {
    lang: 'en',
  },
  title: routeName.value,
});
</script>

<template>
  <div>
    <Disclosure as="nav" class="bg-white shadow">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 justify-between">
          <NuxtLink class="flex" to="/">
            <div class="flex flex-shrink-0 items-center">
              <img
                alt="Logo"
                class="h-8 w-auto"
                src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
              />
              <p class="ml-5">{{ routeName }}</p>
            </div>
          </NuxtLink>

          <ExpandableListNavigationButtons
            v-if="route.path === '/categories'"
            resource="category"
          />
          <ExpandableListNavigationButtons
            v-if="route.path === '/projects'"
            resource="project"
          />
        </div>
      </div>
    </Disclosure>

    <slot />
  </div>
</template>

<style scoped></style>
