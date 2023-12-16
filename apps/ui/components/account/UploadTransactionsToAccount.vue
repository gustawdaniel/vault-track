<script setup lang="ts">
import EventEmitter from 'events';
import draggable from 'vuedraggable';
import dayjs, { extend } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { ComputedAccount } from '~/store/account';
import FileUploadAreaInput from '~/components/account/FileUploadAreaInput.vue';
import {
  type CsvFileEncoding,
  readFileContentFromInputEvent,
} from '~/utils/readFileContentFromInputEvent';
import { dropNotFullColumns, parseTextAsCsv } from '~/utils/parseTextAsCsv';
import type { Transaction } from '~/store/transaction';
import { tableHeadersToTransactionKeys } from '~/components/account/tableHeadersToTransactionKeys';
import UploadTransactionAcceptance from '~/components/account/UploadTransactionAcceptance.vue';
import type { ClearedStatus } from '~/store/clearedStatus';

extend(customParseFormat);

const signal = new EventEmitter();

const isOpen = ref(false);

function close() {
  signal.emit('reset');
  csvTable.value = [];
  transactions.value = [];
  readyToReview.value = false;
  isOpen.value = false;
}

const props = defineProps<{
  account: ComputedAccount;
}>();

const csvTable = ref<string[][]>([]);

const headers = ref<{ name: keyof Transaction }[][]>([]);

function removeRow(index: number): void {
  csvTable.value.splice(index, 1);
}

const possibleHeaders = ref<Array<{ name: keyof Transaction }>>([
  { name: 'amount' },
  { name: 'category' },
  { name: 'date' },
  { name: 'payee' },
  { name: 'memo' },
  { name: 'clearedStatus' },
]);

function log(...args: any) {
  console.log(args);
}

const transactions = ref<Transaction[]>([]);

function stringToClearedStatus(input?: string): ClearedStatus {
  switch (input) {
    case '*':
      return '*';
    case '?':
      return '?';
    case 'X':
      return 'X';
    default:
      return '';
  }
}

const readyToReview = ref<boolean>(false);

function parseAmount(value: string): number {
  return Number(value.replaceAll(',', '.').replace(/[^0-9.]/g, ''));
}

function csvToJson(): void {
  const headerMap = tableHeadersToTransactionKeys(headers.value);

  for (const row of csvTable.value.filter((row) =>
    isValidRow(row, headers.value),
  )) {
    transactions.value.push({
      account: props.account.name,
      accountId: props.account.id,
      date: dayjs(row[headerMap.date], dateFormat.value).format('YYYY-MM-DD'),
      category: row[headerMap.category],
      amount: parseAmount(
        row[headerMap.amount] ||
          row[Math.min(headerMap.amount + 1, row.length - 1)],
      ),
      memo: row[headerMap.memo],
      payee: row[headerMap.payee],
      clearedStatus: stringToClearedStatus(row[headerMap.clearedStatus]),
    });
  }
  readyToReview.value = true;
}

function isCorrect(
  value: string,
  key: keyof Transaction,
  dateFormat = 'YYYY-MM-DD',
): boolean {
  switch (key) {
    case 'amount':
      return Number.isFinite(parseAmount(value));
    case 'date':
      return dayjs(value, dateFormat).isValid();
    default:
      return false;
  }
}

function titleMatchToTransactionKey(
  title: string,
  key: keyof Transaction,
): boolean {
  switch (key) {
    // #Data księgowania	#Data operacji	#Opis operacji	#Tytuł	#Nadawca/Odbiorca	#Numer konta	#Kwota	#Saldo po operacji

    case 'date':
      return /^#?Data/.test(title) || /Date/.test(title);
    case 'category':
      return (
        /^Rodzaj/.test(title) ||
        /^#Opis operacji/.test(title) ||
        /Type/.test(title)
      );
    case 'payee':
      return /^Odbiorca/.test(title) || /^#Nadawca/.test(title);
    case 'memo':
      return (
        /^Opis/.test(title) ||
        /^#Tytuł/.test(title) ||
        /Description/.test(title)
      );
    case 'amount':
      return (
        /^Obciążenia/.test(title) ||
        /^#Kwota/.test(title) ||
        /Paid Out/.test(title)
      );
    default:
      return false;
  }
}

function moveKeyToHeaderIndex(key: keyof Transaction, index: number): void {
  possibleHeaders.value = possibleHeaders.value.filter((v) => v.name !== key);
  const assigned = headers.value.find((headersInColumn) =>
    headersInColumn.some((header) => header.name === key),
  );
  if (!assigned) {
    headers.value.splice(index, 1, headers.value[index].concat({ name: key }));
  }
}

function autoAssignHeaders() {
  if (!csvTable.value.length) return;

  csvTable.value[0].forEach((title: string, index: number) => {
    const keys: (keyof Transaction)[] = [
      'date',
      'category',
      'payee',
      'memo',
      'amount',
    ];

    for (const key of keys) {
      if (titleMatchToTransactionKey(title, key))
        moveKeyToHeaderIndex(key, index);
    }
  });
}

const possibleEncodings: CsvFileEncoding[] = ['utf8', 'msee'];
const encoding = ref<CsvFileEncoding>('utf8');

async function upload(event: Event) {
  const [type, text] = await readFileContentFromInputEvent(
    event,
    encoding.value,
  );

  if (type !== 'csv') throw new Error(`Only csv is allowed here`);

  const parsedValues = dropNotFullColumns(parseTextAsCsv(text));

  if (parsedValues.length) {
    headers.value = [];
    for (let i = 0; i < parsedValues[0].length; i++) {
      headers.value.push([]);
    }
    csvTable.value = parsedValues;
  }

  autoAssignHeaders();
  guessDateFormat();
}

function isValidRow(
  row: string[],
  headers: { name: keyof Transaction }[][],
): boolean {
  const headerMap = tableHeadersToTransactionKeys(headers);

  console.log('headerMap', headerMap);

  if (!Number.isFinite(headerMap.date) || !Number.isFinite(headerMap.amount))
    return false;

  return (
    isCorrect(row[headerMap.date], 'date', dateFormat.value) &&
    isCorrect(row[headerMap.amount], 'amount', dateFormat.value)
  );
}

const dateFormat = ref<string>('YYYY-MM-DD');

function guessDateFormat() {
  const headerMap = tableHeadersToTransactionKeys(headers.value);

  if (!Number.isFinite(headerMap.date)) return false;

  const knownFormats = ['YYYY-MM-DD', 'DD.MM.YYYY'] as const;
  const knownRegexes = {
    'YYYY-MM-DD': /\d{4}-\d{2}-\d{2}/,
    'DD.MM.YYYY': /\d{2}.\d{2}.\d{4}/,
  } as const;
  const points = new Map(knownFormats.map((format) => [format, 0]));

  for (const row of csvTable.value) {
    const date = row[headerMap.date];
    console.log(date);
    for (const format of knownFormats) {
      if (knownRegexes[format].test(date)) {
        points.set(format, (points.get(format) ?? 0) + 1);
      }
    }
  }

  console.log(points);

  dateFormat.value = [...points.entries()].reduce((a, b) =>
    a[1] > b[1] ? a : b,
  )[0];
}
</script>

<template>
  <div>
    <UButton
      icon="i-heroicons-document-arrow-down"
      size="xs"
      label="Import transactions"
      class="mt-4 mx-3"
      @click="isOpen = true"
    />
    <UModal v-model="isOpen" fullscreen>
      <UCard
        :ui="{
          base: 'h-full flex flex-col overflow-auto',
          rounded: '',
          divide: 'divide-y divide-gray-100 dark:divide-gray-800',
          body: {
            base: 'grow',
          },
        }"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3
              class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
            >
              Upload transactions to {{ account.name }}
            </h3>

            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="close"
            />
          </div>
        </template>
        <div>
          <div v-if="!readyToReview">
            <UFormGroup label="Encoding" name="encoding">
              <USelectMenu v-model="encoding" :options="possibleEncodings" />
            </UFormGroup>

            <FileUploadAreaInput
              accept=".csv,.json"
              :signal="signal"
              @upload="upload"
            />
          </div>

          <div v-if="csvTable.length && !readyToReview">
            <div class="flex">
              <draggable
                class="list-group"
                :list="possibleHeaders"
                group="people"
                item-key="name"
                @change="log"
              >
                <template #item="{ element }">
                  <UBadge color="gray" variant="solid" class="cursor-grab">
                    {{ element.name }}
                  </UBadge>
                </template>
              </draggable>
            </div>

            <Debug>{{ headers }}</Debug>

            <table
              class="table-fixed text-xs break-all hover:table-fixed border-spacing-2 border-separate"
            >
              <thead>
                <tr>
                  <th></th>
                  <th
                    v-for="(col, colIndex) in csvTable[0]"
                    :key="colIndex"
                    class="border border-dashed border-gray-900/10"
                  >
                    <draggable
                      class="list-group"
                      :list="headers[colIndex]"
                      group="people"
                      item-key="name"
                      @change="log"
                    >
                      <template #item="{ element }">
                        <UBadge
                          color="gray"
                          variant="solid"
                          class="cursor-grab"
                        >
                          {{ element.name }}
                        </UBadge>
                      </template>
                    </draggable>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, rowIndex) in csvTable"
                  :key="rowIndex"
                  :class="
                    isValidRow(row, headers) ? '' : 'bg-gray-100 text-gray-400'
                  "
                >
                  <td>
                    <button @click="removeRow(rowIndex)">x</button>
                  </td>
                  <td v-for="(col, colIndex) in row" :key="colIndex">
                    {{ col }}
                  </td>
                </tr>
              </tbody>
            </table>

            <UButton block @click="csvToJson">Ready to review</UButton>

            <Debug v-if="transactions.length">{{ transactions }}</Debug>
          </div>

          <UploadTransactionAcceptance
            v-if="readyToReview"
            :transactions-to-import="transactions"
            :account="account"
            @close="close"
          />
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<style scoped></style>
