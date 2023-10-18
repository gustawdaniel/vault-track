<script lang="ts" setup>
import dayjs from 'dayjs';
import { getExportContent } from '~/components/backup/getExportContent';

function download(content: string, mimeType: string, filename: string) {
  const a = document.createElement('a'); // Create "a" element
  const blob = new Blob([content], { type: mimeType }); // Create a blob (file-like object)
  const url = URL.createObjectURL(blob); // Create an object URL from blob
  a.setAttribute('href', url); // Set "a" element link
  a.setAttribute('download', filename); // Set download filename
  a.click(); // Start downloading
}

function exportQif() {
  download(
    getExportContent('qif'),
    'text/plain',
    `backup-${dayjs().unix()}.qif`,
  );
}

function exportJson() {
  download(
    getExportContent('json'),
    'application/json',
    `backup-${dayjs().unix()}.json`,
  );
}
</script>

<template>
  <div>
    <button class="border border-black border-solid" @click="exportQif">
      Export QIF
    </button>
    <button class="border border-black border-solid" @click="exportJson">
      Export JSON
    </button>
  </div>
</template>

<style scoped></style>
