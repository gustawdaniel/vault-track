<script lang="ts" setup>
const navigation = [
  { name: 'Categories', to: '/categories', current: true },
  { name: 'Project', to: '/projects', current: false },
];
</script>

<template>
  <nav aria-label="Sidebar" class="flex flex-1 flex-col">
    <ul class="-mx-2 space-y-1" role="list">
      <li v-for="item in navigation" :key="item.name">
        <NuxtLink
          :class="[
            item.current
              ? 'bg-gray-50 text-indigo-600'
              : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
            'group flex gap-x-3 rounded-md p-2 pl-3 text-sm leading-6 font-semibold',
          ]"
          :to="item.to"
          >{{ item.name }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
