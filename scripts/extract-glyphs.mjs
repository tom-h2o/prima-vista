// Extrahiert SMuFL-Glyphen aus Bravura (SIL OFL 1.1) als SVG-Pfade.
// Aufruf: node scripts/extract-glyphs.mjs <pfad/zu/bravura.otf>
// Einheit: 1 = ein Notenlinienabstand, Ursprung = Glyphen-Grundlinie, y nach unten.
import opentype from "opentype.js";
import { writeFileSync, readFileSync } from "node:fs";

const file = process.argv[2];
const buf = readFileSync(file);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const glyphs = { gClef: 0xe050, fClef: 0xe062, noteheadBlack: 0xe0a4, noteheadWhole: 0xe0a2 };
let out = "// Automatisch erzeugt aus Bravura (© Steinberg, SIL Open Font License 1.1).\n// 1 Einheit = 1 Linienabstand, y nach unten, Ursprung auf der Grundlinie.\n\n";
for (const [name, cp] of Object.entries(glyphs)) {
  const g = font.charToGlyph(String.fromCodePoint(cp));
  const p = g.getPath(0, 0, 4); // fontSize 4 => 1 em = 4 Linienabstände
  const bb = p.getBoundingBox();
  const d = p.toPathData(3);
  out += `export const ${name} = { d: ${JSON.stringify(d)}, x1: ${bb.x1.toFixed(3)}, y1: ${bb.y1.toFixed(3)}, x2: ${bb.x2.toFixed(3)}, y2: ${bb.y2.toFixed(3)} };\n`;
}
writeFileSync("src/lib/glyphs.ts", out);
console.log("ok");
