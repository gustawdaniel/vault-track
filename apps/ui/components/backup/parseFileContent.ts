import type { Data } from 'qif2json/src/lib/types';
import { parse as parseQif } from 'qif2json';
import type { FileType } from '~/components/backup/types';

export function parseFileContent(
  type: FileType,
  content: string,
): Data | undefined {
  console.log('type', type);
  console.log('content', content);
  if (type === 'qif') return parseQif(content);
  if (type === 'json') return JSON.parse(content) as Data;
}
