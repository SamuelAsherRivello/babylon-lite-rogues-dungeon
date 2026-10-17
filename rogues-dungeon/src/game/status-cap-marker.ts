export function statusCapMarker(rank: number) {
  const value = Math.max(1, Math.min(99, rank));
  if (value <= 5) return value * 10;
  return 50 + 49 * (1 - Math.exp(-(value - 5) / 12)) / (1 - Math.exp(-94 / 12));
}
