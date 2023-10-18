<script lang="ts" setup>
function openSettings() {
  // TODO: add settings
  alert('settings not implemented');
}

function toggleSearch() {
  // TODO: add search
  alert('search not implemented');
}
</script>

<template>
  <div class="m-2">
    <div class="justify-between flex">
      <NuxtLink to="/transaction/new">
        <UButton color="gray" icon="i-heroicons-plus" />
      </NuxtLink>
      <NuxtLink to="/budgets">
        <UButton color="gray" icon="i-heroicons-briefcase" />
      </NuxtLink>
      <NuxtLink to="/schedules">
        <UButton color="gray" icon="i-heroicons-calendar-days" />
      </NuxtLink>
      <UButton
        color="gray"
        icon="i-heroicons-magnifying-glass"
        @click="toggleSearch"
      />
      <NuxtLink to="/reports">
        <UButton color="gray" icon="i-heroicons-chart-pie" />
      </NuxtLink>
      <UButton
        color="gray"
        icon="i-heroicons-ellipsis-vertical"
        @click="openSettings"
      />
    </div>
  </div>
</template>

<style scoped></style>
