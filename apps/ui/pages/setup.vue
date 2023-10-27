<script lang="ts" setup>
import {
  ArrowPathIcon,
  CloudArrowUpIcon,
  LockClosedIcon,
} from '@heroicons/vue/20/solid';
import { seedDemoData } from '~/utils/seed';

const secondaryFeatures = [
  {
    name: 'Add my own data',
    description:
      'Just create my accounts, transactions and categories starting from today.',
    click: () => {
      const router = useRouter();
      router.push('/account/new?edit=1');
    },
    icon: CloudArrowUpIcon,
    button: 'First account',
  },
  {
    name: 'Add demo data',
    description: 'Show how apps look like with demo data generated as example.',
    click: () => {
      seedDemoData();

      const router = useRouter();
      router.push('/');
    },
    icon: LockClosedIcon,
    button: 'Load example data',
  },
  {
    name: 'Import my qif or json file',
    description: 'Import qif or json file exported from other app or this app.',
    click: () => {
      const router = useRouter();
      router.push('/backup');
    },
    icon: ArrowPathIcon,
    button: 'Import my file',
  },
];
</script>

<template>
  <div class="mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8">
    <div class="mx-auto max-w-2xl lg:text-center">
      <h2 class="text-base font-semibold leading-7 text-indigo-600">
        Enter data
      </h2>
      <p
        class="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
      >
        Add accounts, transactions and categories
      </p>
      <p class="mt-6 text-lg leading-8 text-gray-600">
        Any data you introducing to app are stored in your browser. It is why it
        works with light speed, is super secure and not require any email from
        you.
      </p>
    </div>
    <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
      <dl
        class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3"
      >
        <div
          v-for="feature in secondaryFeatures"
          :key="feature.name"
          class="flex flex-col"
        >
          <dt
            class="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900"
          >
            <component
              :is="feature.icon"
              aria-hidden="true"
              class="h-5 w-5 flex-none text-indigo-600"
            />
            {{ feature.name }}
          </dt>
          <dd
            class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600"
          >
            <p class="flex-auto">{{ feature.description }}</p>
            <p class="mt-6">
              <button
                class="text-md font-semibold leading-6 text-indigo-600"
                @click="feature.click"
              >
                {{ feature.button }} <span aria-hidden="true">→</span>
              </button>
            </p>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<style scoped></style>
