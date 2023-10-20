<script lang="ts" setup>
// current 'bg-gray-50 text-indigo-600'

import { Disclosure } from '@headlessui/vue';
import { PlusIcon } from '@heroicons/vue/20/solid';
import { useCategoryStore } from '~/store/category';

const categoryStore = useCategoryStore();

const categoriesTree = categoryStore.tree;
</script>

<template>
  <div>
    <Disclosure as="nav" class="bg-white shadow">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 justify-between">
          <div class="flex">
            <div class="flex flex-shrink-0 items-center">
              <img
                alt="Logo"
                class="h-8 w-auto"
                src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
              />
            </div>
          </div>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <NuxtLink
                class="relative inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                to="/category/new"
                type="button"
              >
                <PlusIcon aria-hidden="true" class="-ml-0.5 h-5 w-5" />
                New Category
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </Disclosure>

    <!--    <pre>{{ categoryStore.tree }}</pre>-->

    <nav aria-label="Sidebar" class="flex flex-1 flex-col">
      <ul class="-mx-2 space-y-1" role="list">
        <li
          v-for="category in categoriesTree"
          :key="category.category"
          :class="[
            'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
            'group flex gap-x-3 rounded-md p-2 pl-3 text-sm leading-6 font-semibold',
          ]"
        >
          <span class="cursor-pointer">{{ category.category }}</span>

          <nav aria-label="Sidebar" class="flex flex-1 flex-col mt-8">
            <ul class="-mx-2 space-y-1" role="list">
              <li
                v-for="children in category.children"
                :key="children.category"
                :class="[
                  'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                  'group flex gap-x-3 rounded-md p-2 pl-3 text-sm leading-6 font-semibold',
                ]"
              >
                <span class="cursor-pointer">{{ children.category }}</span>
              </li>
            </ul>
          </nav>
        </li>
      </ul>
    </nav>
  </div>
</template>

<style scoped></style>
