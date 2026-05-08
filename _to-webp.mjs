/** Convert all PNGs in public/assets/images/{screens,marketing} to WebP. */
import sharp from "sharp";
import { readdirSync, statSync } from "fs";
import { join } from "path";

const dirs = [
  "public/assets/images/screens",
  "public/assets/images/marketing",
];
let total = 0;
let saved = 0;
for (const dir of dirs) {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".png")) continue;
    const src = join(dir, f);
    const out = src.replace(/\.png$/, ".webp");
    const before = statSync(src).size;
    await sharp(src).webp({ quality: 82 }).toFile(out);
    const after = statSync(out).size;
    total += before;
    saved += before - after;
    console.log(
      `${f}: ${(before / 1024).toFixed(0)}K → ${(after / 1024).toFixed(0)}K (-${(((before - after) / before) * 100).toFixed(0)}%)`,
    );
  }
}
console.log(
  `\nTotal: saved ${(saved / 1024 / 1024).toFixed(2)}MB of ${(total / 1024 / 1024).toFixed(2)}MB (${((saved / total) * 100).toFixed(0)}%)`,
);
