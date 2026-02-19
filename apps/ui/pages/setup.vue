<script lang="ts" setup>
import {
  ArrowPathIcon,
  CloudArrowDownIcon,
  PlusCircleIcon,
  LockClosedIcon,
  DocumentArrowUpIcon
} from '@heroicons/vue/24/outline'; // Switched to outline for larger cards
import { seedDemoData } from '~/utils/seed';

const router = useRouter();

function startFresh() {
  router.push('/account/new?edit=1');
}

function syncExisting() {
  router.push('/settings/sync');
}

function importData() {
  router.push('/backup');
}

function loadDemo() {
  seedDemoData();
  router.push('/');
}
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center items-center px-6 py-12 lg:px-8 bg-gray-50 dark:bg-gray-900">
    <div class="mx-auto max-w-2xl text-center mb-12">
      <h2 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
        Welcome to Vault Track
      </h2>
      <p class="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400">
        Your privacy-first finance tracker. Data stays on your device.
        <br />How would you like to start?
      </p>
    </div>

    <!-- Primary Actions -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-4xl w-full">
      <!-- Start Fresh Card -->
      <div
        class="group relative flex flex-col items-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-indigo-500 dark:hover:ring-indigo-400 hover:shadow-lg transition-all cursor-pointer"
        @click="startFresh"
      >
        <div class="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform">
          <PlusCircleIcon class="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Start Fresh</h3>
        <p class="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Create a new budget from scratch. Add manually your accounts and transactions.
        </p>
        <span class="mt-6 text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">
          Create New Data &rarr;
        </span>
      </div>

      <!-- Sync Card -->
      <div
        class="group relative flex flex-col items-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-sky-500 dark:hover:ring-sky-400 hover:shadow-lg transition-all cursor-pointer"
        @click="syncExisting"
      >
        <div class="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform">
          <CloudArrowDownIcon class="h-10 w-10 text-sky-600 dark:text-sky-400" />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Sync Existing</h3>
        <p class="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have data on another device? Connect to your sync group to download it.
        </p>
        <span class="mt-6 text-sm font-semibold text-sky-600 dark:text-sky-400 group-hover:underline">
          Connect Device &rarr;
        </span>
      </div>
    </div>

    <!-- Secondary Actions -->
    <div class="mt-12 flex flex-col sm:flex-row gap-8 text-center sm:text-left">
      <button
        class="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        @click="importData"
      >
        <DocumentArrowUpIcon class="h-5 w-5" />
        Import from Backup / QIF
      </button>

      <button
        class="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        @click="loadDemo"
      >
        <LockClosedIcon class="h-5 w-5" />
        Try with Demo Data
      </button>
    </div>
  </div>
</template>

<style scoped></style>
