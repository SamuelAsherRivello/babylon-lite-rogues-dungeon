/** Derive a deterministic level seed from the persistent world and run identity. */
export function worldFloorSeed(worldSeed: number, slot: number, run: number, level: number) {
  let value = (worldSeed >>> 0) ^ Math.imul(slot >>> 0, 0x9e3779b1) ^ Math.imul(run >>> 0, 0x85ebca6b) ^ Math.imul(level >>> 0, 0xc2b2ae35);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}
