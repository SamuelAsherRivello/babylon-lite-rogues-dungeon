const encoder = new TextEncoder();

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) value = (value >>> 8) ^ crcTable[(value ^ byte) & 0xff];
  return (value ^ 0xffffffff) >>> 0;
}

function u16(value: number) { return [value & 0xff, (value >>> 8) & 0xff]; }
function u32(value: number) { return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]; }

function bytesForEntry(path: string, data: Uint8Array<ArrayBuffer>, offset: number) {
  const name = encoder.encode(path);
  const header = new Uint8Array([
    ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
    ...u32(crc32(data)), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...name,
  ]);
  return { header, data, central: { name, crc: crc32(data), size: data.length, offset } };
}

export function createStoredZip(entries: [string, string | Uint8Array<ArrayBuffer>][]) {
  const parts = []; const central = []; let offset = 0;
  for (const [path, input] of entries) {
    const data = input instanceof Uint8Array ? input : encoder.encode(input);
    const entry = bytesForEntry(path, data, offset);
    parts.push(entry.header, data); central.push(entry.central); offset += entry.header.length + data.length;
  }
  const centralStart = offset;
  for (const entry of central) {
    const header = new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(entry.crc), ...u32(entry.size), ...u32(entry.size), ...u16(entry.name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(entry.offset), ...entry.name,
    ]);
    parts.push(header); offset += header.length;
  }
  parts.push(new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length), ...u32(offset - centralStart), ...u32(centralStart), ...u16(0)]));
  return new Blob(parts, { type: "application/zip" });
}
