import dayjs from 'dayjs';

export function toFullDate(short: string): string {
  return dayjs(short).format('YYYY-MM-DDT00:00:00');
}

export function toShortDate(full: string): string {
  return dayjs(full).format('YYYY-MM-DD');
}
