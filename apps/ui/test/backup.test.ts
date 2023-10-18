import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { it, expect, describe, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { parseFileContent } from '~/components/backup/parseFileContent';
import { loadDataToStore } from '~/components/backup/loadDataToStore';
import { getExportContent } from '~/components/backup/getExportContent';
import { clearLocalStorage } from '~/components/backup/clearLocalStorage';
import { useTransactionStore } from '~/store/transaction';

describe('backup', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await clearLocalStorage();
  });

  it('restoring and creating backup do not change content of qif', () => {
    const content = fs
      .readFileSync(path.join(__dirname, `/files/backup-1697380785.qif`))
      .toString();
    const payload = parseFileContent('qif', content);

    expect(payload).toBeDefined();
    assert.ok(payload);
    expect(payload.transactions).to.length(1136);
    expect(payload.categories).to.length(56);
    expect(payload.accounts).to.length(22);

    loadDataToStore(payload);

    const exportedQif = getExportContent('qif');

    expect(exportedQif).eq(content);
  });

  it('backup restored from qif and saved as json, then restored from json and saved as qif works', async () => {
    const transactionStore = useTransactionStore();

    const content = fs
      .readFileSync(path.join(__dirname, `/files/backup-1697380785.qif`))
      .toString();
    const payloadQif = parseFileContent('qif', content);
    assert.ok(payloadQif);
    loadDataToStore(payloadQif);

    expect(transactionStore.transactions.length).eq(1136);

    const exportedJson = getExportContent('json');

    await clearLocalStorage();

    expect(localStorage.getItem('transaction')).toBeDefined();

    expect(transactionStore.transactions.length).eq(0);

    const payloadJson = parseFileContent('json', exportedJson);
    assert.ok(payloadJson);
    loadDataToStore(payloadJson);

    const exportedQif = getExportContent('qif');
    expect(exportedQif).eq(content);
  });
});
