<script lang="ts" setup>
import dayjs from 'dayjs';
import { CodeBracketIcon, CircleStackIcon } from '@heroicons/vue/24/outline';
import { getExportContent } from '~/components/backup/getExportContent';
import AppContainer from '~/components/shared/AppContainer.vue';

function download(content: string, mimeType: string, filename: string) {
  const a = document.createElement('a'); // Create "a" element
  const blob = new Blob([content], { type: mimeType }); // Create a blob (file-like object)
  const url = URL.createObjectURL(blob); // Create an object URL from blob
  a.setAttribute('href', url); // Set "a" element link
  a.setAttribute('download', filename); // Set download filename
  a.click(); // Start downloading
}

function exportQif() {
  download(
    getExportContent('qif'),
    'text/plain',
    `backup-${dayjs().unix()}.qif`,
  );
}

function exportJson() {
  download(
    getExportContent('json'),
    'application/json',
    `backup-${dayjs().unix()}.json`,
  );
}

const items = [
  {
    title: 'Export JSON',
    description: 'All your data can be stored as single JSON.',
    icon: CodeBracketIcon,
    background: 'bg-violet-500',
    click: exportJson,
  },
  {
    title: 'Export QIF',
    description:
      'QIF is more portable but do not contain some details like projects or account order',
    icon: CircleStackIcon,
    background: 'bg-blue-700',
    click: exportQif,
  },
];
</script>

<template>
  <AppContainer class="mt-10">
    <h2 class="text-base font-semibold leading-6 text-gray-900">
      Export Backup
    </h2>
    <p class="mt-1 text-sm text-gray-500">
      You can get all your data from application and save on your device. They
      are stored in locale storage of browser.
    </p>
    <ul
      class="mt-6 grid grid-cols-1 gap-6 border-b border-t border-gray-200 py-6 sm:grid-cols-2"
      role="list"
    >
      <li v-for="(item, itemIdx) in items" :key="itemIdx" class="flow-root">
        <div
          class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500 hover:bg-gray-50"
          @click="item.click"
        >
          <div
            :class="[
              item.background,
              'flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg',
            ]"
          >
            <component
              :is="item.icon"
              aria-hidden="true"
              class="h-6 w-6 text-white"
            />
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-900">
              <span class="focus:outline-none">
                <span aria-hidden="true" class="absolute inset-0" />
                <span>{{ item.title }}</span>
                <span aria-hidden="true"> &rarr;</span>
              </span>
            </h3>
            <p class="mt-1 text-sm text-gray-500">{{ item.description }}</p>
          </div>
        </div>
      </li>
    </ul>
  </AppContainer>
</template>

<style scoped></style>
