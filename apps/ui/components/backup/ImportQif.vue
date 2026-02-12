<script lang="ts" setup>
import mitt from 'mitt';
import type { Data } from 'qif2json/src/lib/types';
import { parseFileContent } from '~/components/backup/parseFileContent';
import { loadDataToStore } from '~/components/backup/loadDataToStore';
import { useAccountStore } from '~/store/account';
import AppContainer from '~/components/shared/AppContainer.vue';
import FileUploadAreaInput from '~/components/account/FileUploadAreaInput.vue';
import { readFileContentFromInputEvent } from '~/utils/readFileContentFromInputEvent';

const signal = mitt();

function reset() {
  signal.emit('reset');
}

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
</script>

<template>
  <AppContainer>
    <div class="mt-5 border-b border-gray-200 bg-white px-4 py-5">
      <div class="-ml-4 -mt-4 flex flex-wrap items-center justify-between sm:flex-nowrap">
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

      <FileUploadAreaInput accept=".qif,.json" :signal="signal" @upload="upload" />
    </div>
  </AppContainer>
</template>
