// Evidence for the campaign page on a local build: screenshots, a short recording and throttled performance numbers.
//   npm run build && npx astro preview --port 4331 &      then      node scripts/capture-campaign.mjs [base-url] [out-dir]
// Shots at 390, 768 and 1280 px, in a light and a dark colour scheme (the page is dark by design in both) and with Reduce Motion;
// perf: a phone (4x CPU, Slow 4G) with an empty cache, 5 runs: first contentful paint, largest contentful paint, layout shift, bytes.
import puppeteer from "puppeteer";
import fs from "node:fs";
import DATA from "../src/data/recharge.json" with { type: "json" };
const BASE = (process.argv[2] || "http://127.0.0.1:4331").replace(/\/$/, ""), OUT = process.argv[3] || "docs/recharge/evidence";
const URL_ = (q = "") => `${BASE}/${DATA.route}${q}`;
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: "new", args: ["--mute-audio", "--autoplay-policy=no-user-gesture-required", "--no-first-run"] });
const SIZES = { 390: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 768: { width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 1280: { width: 1280, height: 800, deviceScaleFactor: 1 } };
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

async function open(w, { scheme = "dark", reduced = false } = {}) {
  const p = await b.newPage();
  await p.setViewport(SIZES[w]);
  if (SIZES[w].isMobile) await p.setUserAgent(IPHONE);
  await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }, { name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }]);
  await p.setRequestInterception(true); p.on("request", (r) => (r.url().includes("/.netlify/") ? r.abort() : r.continue()));
  await p.evaluateOnNewDocument(() => {
    try { localStorage.setItem("wehale.consent.v1", JSON.stringify({ analytics: false, ads: false, choice: "denied", at: new Date().toISOString(), v: 2 })); } catch (_) {}
    window.__cls = 0; window.__lcp = 0;
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch (_) {}
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch (_) {}
  });
  return p;
}

for (const w of [390, 768, 1280]) for (const scheme of ["light", "dark"]) {
  const p = await open(w, { scheme });
  await p.goto(URL_("?ch=newsletter"), { waitUntil: "load" }); await sleep(3500);
  await p.screenshot({ path: `${OUT}/page-${w}-${scheme}.jpg`, type: "jpeg", quality: 82 });
  await p.close();
}
for (const w of [390, 1280]) {   // Reduce Motion: the still poster, no video requested
  const p = await open(w, { reduced: true }); let video = 0; p.on("request", (r) => { if (r.url().endsWith(".mp4")) video++; });
  await p.goto(URL_(), { waitUntil: "load" }); await sleep(3000);
  await p.screenshot({ path: `${OUT}/page-${w}-reduce-motion.jpg`, type: "jpeg", quality: 82 });
  console.log(`reduce motion ${w}: video requests = ${video}`);
  await p.close();
}
{ // a recording: phone, the arrival and the loop for 10 s
  const p = await open(390); await p.goto(URL_("?ch=newsletter"), { waitUntil: "domcontentloaded" });
  const rec = await p.screencast({ path: `${OUT}/page-390-recording.webm`, speed: 1 }); await sleep(10000); await rec.stop(); await p.close();
}
// performance: the phone, Slow 4G (1.6 Mbit/s, 150 ms), 4x CPU, a cold cache each run
const runs = [];
for (let i = 0; i < 5; i++) {
  const p = await open(390); const cdp = await p.createCDPSession();
  await cdp.send("Network.enable"); await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  let bytes = 0, firstBytes = 0, video = 0; cdp.on("Network.loadingFinished", (e) => { bytes += e.encodedDataLength; });
  p.on("request", (r) => { if (r.url().endsWith(".mp4")) video++; });
  await p.goto(URL_("?ch=newsletter"), { waitUntil: "load" }); const loaded = await p.evaluate(() => performance.now()); firstBytes = bytes;
  await sleep(2500);
  const m = await p.evaluate(() => ({ fcp: (performance.getEntriesByName("first-contentful-paint")[0] || {}).startTime, lcp: window.__lcp, cls: window.__cls }));
  runs.push({ ...m, load: loaded, bytesAtLoad: firstBytes, bytesTotal: bytes, video });
  await p.close();
}
const med = (k) => runs.map((r) => r[k]).sort((a, c) => a - c)[Math.floor(runs.length / 2)];
const out = { conditions: "iPhone UA, 390x844, Slow 4G (1.6 Mbit/s down, 150 ms), 4x CPU throttle, cache disabled, 5 runs, headless Chrome", runs, median: { fcp_ms: Math.round(med("fcp")), lcp_ms: Math.round(med("lcp")), cls: +med("cls").toFixed(4), load_ms: Math.round(med("load")), kb_at_load: Math.round(med("bytesAtLoad") / 1024), kb_total_after_2_5s: Math.round(med("bytesTotal") / 1024) } };
fs.writeFileSync(`${OUT}/performance.json`, JSON.stringify(out, null, 2)); console.log(JSON.stringify(out.median));
await b.close();
