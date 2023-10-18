<script lang="ts" setup>
import { FileType } from '~/components/backup/types';
import { parseFileContent } from '~/components/backup/parseFileContent';
import { loadDataToStore } from '~/components/backup/loadDataToStore';
import { clearLocalStorage } from '~/components/backup/clearLocalStorage';
import { useAccountStore } from '~/store/account';

function getFileType(mimeType: string): FileType {
  switch (mimeType) {
    case 'application/x-qw':
      return 'qif';
    case 'application/json':
      return 'json';
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
      const type = getFileType(file.type);
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
  const [type, text] = await readFileContentFromInputEvent(event);
  // console.log(type, text);
  if (!text) return;
  const payload = parseFileContent(type, text);
  // console.log(payload);
  if (!payload) return;
  loadDataToStore(payload);

  computeBalance();
}

const refForm = ref<HTMLFormElement>();

function reset() {
  refForm.value?.reset();
}

function clear() {
  reset();
  return clearLocalStorage();
}
</script>

<template>
  <div>
    <form ref="refForm">
      <input accept=".qif,.json" type="file" @change="upload" />
    </form>

    <button class="border" @click="reset">reset button</button>
    <button class="border" @click="clear">clear all</button>
  </div>
</template>

<style scoped></style>
