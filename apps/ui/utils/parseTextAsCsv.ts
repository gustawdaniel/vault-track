export type CsvDominantDelimiter = ',' | ';';

export function getDominantDelimiter(text: string): CsvDominantDelimiter {
  const comaCount = text.length - text.replaceAll(',', '').length;
  const semicolonCount = text.length - text.replaceAll(';', '').length;

  return comaCount >= semicolonCount ? ',' : ';';
}

export function parseTextAsCsv(text: string): string[][] {
  const delimiter = getDominantDelimiter(text);
  switch (delimiter) {
    case ';':
      return parseTextAsCsvBySemicolon(text);
    default:
      return parseTextAsCsvByComa(text);
  }
}

export function dropNotFullColumns(payload: string[][]): string[][] {
  const maxColumns = Math.max(...payload.map((row) => row.length));
  if (!Number.isFinite(maxColumns)) return [];

  return payload.filter((row) => row.length === maxColumns);
}

function stripQuotations(value: string): string {
  if (!value) return '';
  if (value.startsWith('"') && value.endsWith('"'))
    return value.substring(1, value.length - 1).trim();
  return value.trim();
}

export function parseTextAsCsvBySemicolon(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line: string): boolean => Boolean(line))
    .map((row) => row.split(';').map(stripQuotations));
}

// https://stackoverflow.com/a/41563966/6398044
export function parseTextAsCsvByComa(text: string): string[][] {
  let p = '';
  let row = [''];
  const ret = [row];
  let i = 0;
  let r = 0;
  let s = !0;
  let l;
  for (l of text) {
    if (l === '"') {
      if (s && l === p) row[i] += l;
      s = !s;
    } else if (l === ',' && s) l = row[++i] = '';
    else if (l === '\n' && s) {
      if (p === '\r') row[i] = row[i].slice(0, -1);
      row = ret[++r] = [(l = '')];
      i = 0;
    } else row[i] += l;
    p = l;
  }
  return ret.filter((row) => row.join('').length);
}
