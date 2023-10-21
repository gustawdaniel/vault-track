// thanks to https://stackoverflow.com/a/44134328/6398044
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: 0 | 8 | 4) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0'); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function getRandomColor() {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(100);
  const l = Math.floor(60);
  return hslToHex(h, s, l);
}
