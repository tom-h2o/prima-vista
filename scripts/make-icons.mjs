// Erzeugt die App-Symbole (Bassschlüssel) aus dem Bravura-Glyph in src/lib/glyphs.ts.
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync("src/lib/glyphs.ts", "utf8");
const m = src.match(/export const fClef = \{ d: "([^"]+)", x1: ([-\d.]+), y1: ([-\d.]+), x2: ([-\d.]+), y2: ([-\d.]+) \}/);
const [, d, x1, y1, x2, y2] = m.map((v, i) => (i > 1 ? Number(v) : v));
const gw = x2 - x1;
const gh = y2 - y1;

function svg({ size = 1024, pad = 0.2, rounded = false } = {}) {
  const scale = (size * (1 - 2 * pad)) / Math.max(gw, gh);
  const tx = (size - gw * scale) / 2 - x1 * scale;
  const ty = (size - gh * scale) / 2 - y1 * scale;
  const r = rounded ? size * 0.225 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="30%" cy="20%" r="95%">
      <stop offset="0" stop-color="#2a2622"/>
      <stop offset="1" stop-color="#121316"/>
    </radialGradient>
    <radialGradient id="glow" cx="78%" cy="85%" r="60%">
      <stop offset="0" stop-color="#b4472f" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#b4472f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ink" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbf5ea"/>
      <stop offset="1" stop-color="#e8dcc6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#glow)"/>
  <path d="${d}" fill="url(#ink)" transform="translate(${tx} ${ty}) scale(${scale})"/>
</svg>`;
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon.svg", svg({ rounded: true }));
const out = [
  ["icon-192.png", 192, 0.2],
  ["icon-512.png", 512, 0.2],
  ["apple-touch-icon.png", 180, 0.2],
  ["icon-maskable-512.png", 512, 0.28],
];
for (const [name, size, pad] of out) {
  await sharp(Buffer.from(svg({ size, pad }))).png().toFile(`public/icons/${name}`);
}
await sharp(Buffer.from(svg({ size: 180, pad: 0.2 }))).png().toFile("public/apple-touch-icon.png");
console.log("Symbole erzeugt");
