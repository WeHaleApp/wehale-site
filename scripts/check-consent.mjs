// Consent gating against a build WITH tag IDs set (e.g. PUBLIC_GTM_ID=GTM-TEST …): nothing before a choice, nothing
// after Decline, the tags after Accept. Tracker requests are recorded and aborted, so nothing leaves the machine.
//   node scripts/check-consent.mjs <base-url>
import puppeteer from "puppeteer";
const BASE = (process.argv[2] || "http://127.0.0.1:4331").replace(/\/$/, "");
const T = /googletagmanager|facebook\.net|analytics\.tiktok/;
const browser = await puppeteer.launch({ headless: "new", args: ["--mute-audio"] });
const out = {};
for (const p of ["/", "/breathe"]) for (const act of ["none", "decline", "accept"]) {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  const hits = []; await page.setRequestInterception(true);
  page.on("request", (r) => { if (T.test(r.url())) { hits.push(r.url().split("?")[0]); r.abort(); } else r.continue(); });
  await page.goto(BASE + p, { waitUntil: "networkidle0" });
  const shown = await page.$eval("#whConsent", (e) => !e.hidden);
  if (act !== "none") { await page.click(`#whConsent [data-act=${act}]`); await new Promise((r) => setTimeout(r, 1200)); }
  const cm = await page.evaluate(() => (window.dataLayer || []).filter((e) => e && e[0] === "consent").map((e) => e[1] + ":" + e[2].analytics_storage + "/" + e[2].ad_storage));
  out[`${p} ${act}`] = { bannerShown: shown, trackers: [...new Set(hits)], consentMode: cm };
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 2));
