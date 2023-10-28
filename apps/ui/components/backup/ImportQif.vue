<script lang="ts" setup>
import { CodeBracketIcon } from '@heroicons/vue/24/solid';
import type { Data } from 'qif2json/src/lib/types';
import type { FileType } from '~/components/backup/types';
import { parseFileContent } from '~/components/backup/parseFileContent';
import { loadDataToStore } from '~/components/backup/loadDataToStore';
import { useAccountStore } from '~/store/account';
import AppContainer from '~/components/shared/AppContainer.vue';

function getMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message;
  return 'Unknown error';
}

function getFileType(mimeType: string, name: string): FileType {
  switch (mimeType) {
    case 'application/x-qw':
      return 'qif';
    case 'application/json':
      return 'json';
  }
  if (!mimeType && name) {
    switch (true) {
      case name.endsWith('json'):
        return 'json';
      case name.endsWith('qif'):
        return 'qif';
    }
  }
}

function readFileContentFromInputEvent(
  event: Event,
): Promise<[FileType, string]> {
  const target = event.target as HTMLInputElement;
  if (!target.files) return new Promise((resolve) => resolve([undefined, '']));
  const [file] = target.files;

  return new Promise<[FileType, string]>((resolve) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      const text: string = reader.result ? String(reader.result) : '';
      console.log('file', file);
      console.log('file.type', file.type);
      console.log('file.name', file.name);

      const type = getFileType(file.type, file.name);
      resolve([type, text]);
    });

    if (file) {
      reader.readAsText(file);
    }
  });
}

function computeBalance() {
  const accountStore = useAccountStore();

  accountStore.computeAllBalances();
}

async function upload(event: Event) {
  const toast = useToast();

  const [type, text] = await readFileContentFromInputEvent(event);
  if (!text) {
    reset();
    return toast.add({
      title: 'Empty file',
      description: 'You have to select file with content.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
    });
  }
  if (type !== 'qif' && type !== 'json') {
    reset();
    return toast.add({
      title: 'Type not recognized',
      description: `Type should be "qif" or "json" but found "${type}".`,
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
    });
  }
  let payload: Data | undefined;
  try {
    payload = parseFileContent(type, text);
    if (!payload) {
      reset();
      return toast.add({
        title: 'Invalid file content',
        description:
          'There was problem with parsing of your file. No payload received from parsing.',
        icon: 'i-heroicons-exclamation-circle',
        color: 'red',
      });
    }
  } catch (e: unknown) {
    // eslint-disable-next-line no-console
    console.error(e);
    reset();
    return toast.add({
      title: 'Invalid file content',
      description: `There was problem with parsing of your file. Error details: ${getMessage(
        e,
      )}`,
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
    });
  }
  loadDataToStore(payload);

  computeBalance();

  reset();

  toast.add({
    title: 'Your file was imported',
    description: 'Data was saved to local storage. See on stats above.',
    icon: 'i-heroicons-check-badge',
  });
}

const refForm = ref<HTMLFormElement>();

function reset() {
  refForm.value?.reset();
}
</script>

<template>
  <AppContainer>
    <div class="mt-5 border-b border-gray-200 bg-white px-4 py-5">
      <div
        class="-ml-4 -mt-4 flex flex-wrap items-center justify-between sm:flex-nowrap"
      >
        <div class="mt-4">
          <h3 class="text-base font-semibold leading-6 text-gray-900">
            Import Database
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            These data will be saved in browser storage, we not sending them to
            any server.
          </p>
        </div>
      </div>

      <div class="col-span-full mt-5">
        <div
          class="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10"
        >
          <div class="text-center">
            <CodeBracketIcon
              aria-hidden="true"
              class="mx-auto h-12 w-12 text-gray-300"
            />
            <div class="mt-4 flex text-sm leading-6 text-gray-600">
              <form ref="refForm">
                <label
                  class="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                  for="file-upload"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    accept=".qif,.json"
                    class="sr-only"
                    name="file-upload"
                    type="file"
                    @change="upload"
                  />
                </label>
              </form>

              <p class="pl-1">or drag and drop</p>
            </div>
            <p class="text-xs leading-5 text-gray-600">JSON, QIF</p>
          </div>
        </div>
      </div>
    </div>
  </AppContainer>
</template>
