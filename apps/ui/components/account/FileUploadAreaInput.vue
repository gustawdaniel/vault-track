<script setup lang="ts">
import type { Emitter } from 'mitt';
import { CodeBracketIcon } from '@heroicons/vue/24/solid';

const emit = defineEmits(['upload']);

function upload(event: Event) {
  emit('upload', event);
}

const props = defineProps<{
  accept: string;
  signal: Emitter<any>;
}>();

const extensions = computed<string>(() => {
  return props.accept
    .split(',')
    .map((ext: string) => ext.replace(/^./, '').toUpperCase())
    .join(', ');
});

const refForm = ref<HTMLFormElement>();

function reset() {
  refForm.value?.reset();
}

props.signal.on('reset', reset);
</script>

<template>
  <div class="col-span-full mt-5">
    <div class="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
      <div class="text-center">
        <CodeBracketIcon aria-hidden="true" class="mx-auto h-12 w-12 text-gray-300" />
        <div class="mt-4 flex text-sm leading-6 text-gray-600">
          <form ref="refForm">
            <label
              class="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
              for="file-upload">
              <span>Upload a file</span>
              <input id="file-upload" :accept="accept" class="sr-only" name="file-upload" type="file"
                @change="upload" />
            </label>
          </form>

          <p class="pl-1">or drag and drop</p>
        </div>
        <p class="text-xs leading-5 text-gray-600">{{ extensions }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
