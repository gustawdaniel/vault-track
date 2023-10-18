import { Data } from 'qif2json/src/lib/types';
import { parse as parseQif } from 'qif2json';
import { FileType } from '~/components/backup/types';

export function parseFileContent(
  type: FileType,
  content: string,
): Data | undefined {
  if (type === 'qif') return parseQif(content);
  if (type === 'json') return JSON.parse(content) as Data;
}
