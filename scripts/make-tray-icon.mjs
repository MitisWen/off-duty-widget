// Generates the menu-bar / system-tray icons with no dependencies.
// Run with `node scripts/make-tray-icon.mjs`; the PNGs are committed.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SUPERSAMPLE = 4;

// Geometry is authored in a 36x36 box and scaled for each target size.
const BASE = 36;
const HORIZON_Y = 24;
const SUN = { x: 18, y: HORIZON_Y, r: 7.5 };
const RAYS = [
  [18, 12.6, 18, 15.1],
  [11.9, 15.4, 9.9, 13.4],
  [24.1, 15.4, 26.1, 13.4],
];

function distanceToSegment(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function isInside(x, y) {
  const inSun = y <= HORIZON_Y && Math.hypot(x - SUN.x, y - SUN.y) <= SUN.r;
  if (inSun) return true;
  if (distanceToSegment(x, y, [7.5, HORIZON_Y, 28.5, HORIZON_Y]) <= 1.1) return true;
  return RAYS.some((ray) => distanceToSegment(x, y, ray) <= 0.9);
}

function renderAlpha(size) {
  const scale = size / BASE;
  const alpha = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const px = (x + (sx + 0.5) / SUPERSAMPLE) / scale;
          const py = (y + (sy + 0.5) / SUPERSAMPLE) / scale;
          if (isInside(px, py)) hits += 1;
        }
      }
      alpha[y * size + x] = Math.round((hits / (SUPERSAMPLE * SUPERSAMPLE)) * 255);
    }
  }
  return alpha;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, alpha, [r, g, b]) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x += 1) {
      const offset = rowStart + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = alpha[y * size + x];
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function write(name, size, color) {
  const target = fileURLToPath(new URL(`../src-tauri/icons/${name}`, import.meta.url));
  const png = encodePng(size, renderAlpha(size), color);
  writeFileSync(target, png);
  console.log(`wrote ${target} (${size}x${size}, ${png.length} bytes)`);
}

// macOS menu bar: monochrome template image (system tints it).
write("tray.png", 36, [0, 0, 0]);
// Windows system tray: a warm glyph that stays visible on light and dark taskbars.
write("tray-win.png", 32, [240, 138, 75]);
