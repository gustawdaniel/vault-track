<script lang="ts" setup>
const hover = ref<number>(-1);

export interface MenuOption {
  id: string;
  name: string;
  click: () => void;
}

defineProps<{ options: MenuOption[] }>();
</script>

<template>
  <div
    class="w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
  >
    <div
      v-for="(item, index) in options"
      :key="index"
      @mouseenter="hover = index"
      @mouseleave="hover = -1"
    >
      <a
        :class="[
          hover === index ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
          'block px-4 py-2 text-sm cursor-pointer',
        ]"
        @click="item.click"
        >{{ item.name }}</a
      >
    </div>
  </div>
</template>

<style scoped></style>
