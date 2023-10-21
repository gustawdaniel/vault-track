export function ucFirst(word: string): string {
  if (!word) return '';
  return word.substring(0, 1).toUpperCase() + word.substring(1);
}
