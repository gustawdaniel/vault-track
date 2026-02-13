import legacy from 'legacy-encoding';
import type { FileType } from '~/components/backup/types';
import readXlsxFile from 'read-excel-file';
import dayjs from 'dayjs';

function getFileType(mimeType: string, name: string): FileType {
  switch (mimeType) {
    case 'application/x-qw':
      return 'qif';
    case 'application/json':
      return 'json';
    case 'text/csv':
    case 'text/tab-separated-values':
      return 'csv';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'xlsx';
  }
  if (!mimeType && name) {
    switch (true) {
      case name.endsWith('json'):
        return 'json';
      case name.endsWith('qif'):
        return 'qif';
      case name.endsWith('csv'):
      case name.endsWith('tsv'):
        return 'csv';
      case name.endsWith('xlsx'):
        return 'xlsx';
    }
  }
}

export type CsvFileEncoding = 'utf8' | 'msee';

function getText(
  result: string | ArrayBuffer,
  encoding: CsvFileEncoding,
): string {
  return result
    ? encoding === 'msee'
      ? legacy.decode(result, 'msee')
      : String(result)
    : '';
}


export function readFileContentFromInputEvent(
  event: Event,
  encoding: CsvFileEncoding = 'utf8',
): Promise<[FileType, string]> {
  const target = event.target as HTMLInputElement;
  if (!target.files) return new Promise((resolve) => resolve([undefined, '']));
  const [file] = target.files;

  // Handle XLSX
  if (file && file.name.endsWith('.xlsx')) {
    return readXlsxFile(file).then((rows) => {
      const tsv = rows.map((row) => row.map((cell) => {
        if (cell === null || cell === undefined) return '';
        if (cell instanceof Date) return dayjs(cell).format('YYYY-MM-DD HH:mm:ss'); // Format matching the TSV example
        return String(cell);
      }).join('\t')).join('\n');
      return ['xlsx', tsv];
    });
  }

  return new Promise<[FileType, string]>((resolve) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      const text: string = getText(reader.result, encoding);
      const type = getFileType(file.type, file.name);
      resolve([type, text]);
    });

    if (file) {
      if (encoding === 'msee') {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsText(file);
      }
    }
  });
}
