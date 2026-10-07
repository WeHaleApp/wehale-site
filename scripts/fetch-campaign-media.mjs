// The campaign's media (the ink loop and its poster) is confidential until launch and this repo is public, so it is NOT in git (.gitignore).
// This runs before every build (`prebuild`): with CAMPAIGN_MEDIA_BASE_URL and CAMPAIGN_MEDIA_TOKEN set (Netlify environment variables; docs/recharge/README.md,
// "The campaign's media") it downloads the files from the campaign's private storage into public/recharge/, where the build publishes them under
// /recharge/, behind the password gate. Without them it does nothing and keeps any local copy (`npm run media:local`).
//   GET <base>/<file>   Authorization: Bearer <token>
import fs from "node:fs"; import path from "node:path";
const FILES = ["ink-long.mp4", "ink-poster.webp"], OUT = "public/recharge";
const base = (process.env.CAMPAIGN_MEDIA_BASE_URL || "").replace(/\/$/, ""), token = process.env.CAMPAIGN_MEDIA_TOKEN || "";
const have = (f) => fs.existsSync(path.join(OUT, f));
if (!base || !token) {
  const missing = FILES.filter((f) => !have(f));
  console.log(`[campaign media] no CAMPAIGN_MEDIA_* variables: ${missing.length ? "MISSING " + missing.join(", ") + " (the page falls back to its dark ground)" : "using the local copy"}`);
  process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
for (const f of FILES) {
  const r = await fetch(`${base}/${f}`, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) { console.error(`[campaign media] ${f}: HTTP ${r.status}`); process.exit(1); }
  fs.writeFileSync(path.join(OUT, f), Buffer.from(await r.arrayBuffer()));
  console.log(`[campaign media] ${f} fetched (${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0)} kB)`);
}
