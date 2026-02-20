<script lang="ts" setup>
import { useFps } from '@vueuse/core';
import { useDebugStore } from '~/store/debug';

const fps = useFps();
const debugStore = useDebugStore();

const history = ref<number[]>(new Array(50).fill(60));

watch(fps, (val) => {
  history.value.push(val);
  if (history.value.length > 50) history.value.shift();
});

const linePoints = computed(() => {
  return history.value.map((val, i) => `${i},${60 - val}`).join(' ');
});

const polyPoints = computed(() => {
  const lastX = history.value.length - 1;
  return `${linePoints.value} ${lastX},60 0,60`;
});
</script>

<template>
  <div
    v-if="debugStore.showFps"
    class="fixed top-2 right-2 z-[9999] pointer-events-none flex flex-col items-end gap-1"
  >
    <div class="bg-black/80 text-green-400 px-2 py-1 rounded text-xs font-mono font-bold shadow border border-green-500/30 backdrop-blur-sm">
      FPS: {{ fps }}
    </div>
    
    <!-- Graph -->
    <div class="bg-black/80 p-1 rounded border border-green-500/30 backdrop-blur-sm shadow-lg">
        <svg viewBox="0 0 49 60" class="w-32 h-12 block" preserveAspectRatio="none">
          <!-- 30 FPS Guide Line (y=30) -->
          <line x1="0" y1="30" x2="50" y2="30" stroke="gray" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.5" />
          
          <!-- Area Fill -->
          <polygon
            :points="polyPoints"
            class="text-green-500/30"
            fill="currentColor"
          />
          
          <!-- Stroke Line -->
          <polyline
            :points="linePoints"
            fill="none"
            class="text-green-400"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </svg>
    </div>
  </div>
</template>
