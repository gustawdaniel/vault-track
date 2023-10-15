export function getRandomColor() {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(100) + '%';
  const l = Math.floor(60) + '%';
  return `hsl(${h},${s},${l})`;
}
