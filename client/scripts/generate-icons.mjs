/**
 * Generates PNG app icons from the SVG source.
 * Run: node scripts/generate-icons.mjs
 *
 * Requires: sharp (npm install --save-dev sharp in /client)
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, "../public/icon-1024.svg");
const svg = readFileSync(svgPath);

const sizes = [
  { size: 1024, name: "icon-1024.png" },
  { size: 512, name: "icon-512.png" },
  { size: 192, name: "icon-192.png" },
];

for (const { size, name } of sizes) {
  const outPath = join(__dirname, "../public", name);
  await sharp(svg)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`✓ ${name} (${size}x${size})`);
}

console.log("\nDone! Update manifest.json to include the PNG icons.");
