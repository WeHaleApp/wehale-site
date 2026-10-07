// The campaign's media (the ink loop and its poster) is confidential until launch and this repo is public, so it is NOT in git (.gitignore).
// This runs before every build (`prebuild`): with CAMPAIGN_MEDIA_LOOP_URL and CAMPAIGN_MEDIA_POSTER_URL set (Netlify environment variables, secret: they are
// signed, long-lived Supabase Storage links; docs/recharge/README.md, "The campaign's media") it downloads the two files into public/recharge/, where the build
// publishes them under /recharge/, behind the password gate. The poster (a JPEG in storage) is turned into a WebP. Without the variables it does nothing and
// keeps any local copy (`npm run media:local`). The links are never printed.
import fs from "node:fs"; import path from "node:path";
const OUT = "public/recharge", LOOP = process.env.CAMPAIGN_MEDIA_LOOP_URL || "", POSTER = process.env.CAMPAIGN_MEDIA_POSTER_URL || "";
const FILES = ["ink-long.mp4", "ink-poster.webp"], have = (f) => fs.existsSync(path.join(OUT, f));
if (!LOOP || !POSTER) {
  const missing = FILES.filter((f) => !have(f));
  console.log(`[campaign media] no CAMPAIGN_MEDIA_* variables: ${missing.length ? "MISSING " + missing.join(", ") + " (the page falls back to its dark ground)" : "using the local copy"}`);
  process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
async function get(url, what) {
  const r = await fetch(url);
  if (!r.ok) { console.error(`[campaign media] ${what}: HTTP ${r.status} (an expired or wrong link?)`); process.exit(1); }
  return Buffer.from(await r.arrayBuffer());
}
fs.writeFileSync(path.join(OUT, "ink-long.mp4"), await get(LOOP, "loop"));
const sharp = (await import("sharp")).default;
await sharp(await get(POSTER, "poster")).webp({ quality: 78 }).toFile(path.join(OUT, "ink-poster.webp"));
console.log(`[campaign media] fetched: ink-long.mp4 (${(fs.statSync(path.join(OUT, "ink-long.mp4")).size / 1024).toFixed(0)} kB), ink-poster.webp (${(fs.statSync(path.join(OUT, "ink-poster.webp")).size / 1024).toFixed(0)} kB)`);
