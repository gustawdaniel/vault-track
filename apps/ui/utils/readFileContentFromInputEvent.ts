import legacy from 'legacy-encoding';
import type { FileType } from '~/components/backup/types';

function getFileType(mimeType: string, name: string): FileType {
  switch (mimeType) {
    case 'application/x-qw':
      return 'qif';
    case 'application/json':
      return 'json';
    case 'text/csv':
      return 'csv';
  }
  if (!mimeType && name) {
    switch (true) {
      case name.endsWith('json'):
        return 'json';
      case name.endsWith('qif'):
        return 'qif';
      case name.endsWith('csv'):
        return 'csv';
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
