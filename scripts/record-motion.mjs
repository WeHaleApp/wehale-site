// A short muted screen recording of the home page on a phone (top to bottom, with the swipes), and a frame-rate check
// at 4× CPU throttle. Headless Chrome, sound muted.   node scripts/record-motion.mjs <base-url> <out-dir>
import puppeteer from "puppeteer";
import fs from "node:fs"; import path from "node:path";
const BASE = (process.argv[2] || "http://127.0.0.1:4330").replace(/\/$/, ""), OUT = process.argv[3] || "motion-out";
fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ headless: "new", args: ["--mute-audio"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function phone() {
  const p = await b.newPage();
  await p.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.setRequestInterception(true); p.on("request", (r) => (r.url().includes("/.netlify/") ? r.abort() : r.continue()));
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("wehale.consent.v1", JSON.stringify({ analytics: false, ads: false, v: 2 })); } catch (_) {} });
  return p;
}
// smooth scroll by a distance over ms, and a horizontal swipe on a row
const scroll = (p, dy, ms) => p.evaluate((dy, ms) => new Promise((res) => { const y0 = scrollY, t0 = performance.now(); const e = (u) => 1 - Math.pow(1 - u, 3);
  const f = (t) => { const u = Math.min(1, (t - t0) / ms); scrollTo(0, y0 + dy * e(u)); u < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); }), dy, ms);
const swipe = (p, sel) => p.evaluate((sel) => new Promise((res) => { const r = document.querySelector(sel); if (!r) return res(); const b = r.getBoundingClientRect(); scrollTo({ top: scrollY + b.top - (innerHeight - b.height) / 2, behavior: "smooth" });
  let i = 0; const go = () => { r.scrollBy({ left: r.clientWidth * 0.8, behavior: "smooth" }); if (++i < 2) setTimeout(go, 700); else setTimeout(res, 800); }; setTimeout(go, 300); }), sel);

// 1. the recording (about 14 s)
{
  const p = await phone();
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const rec = await p.screencast({ path: path.join(OUT, "home-phone-motion.webm") });
  await sleep(2600);                       // the hero enters in reading order over the film
  await scroll(p, 812, 1400); await sleep(500);
  await swipe(p, "#sessions [data-swipe]");
  await scroll(p, 700, 1200); await sleep(400);
  await swipe(p, "#app [data-swipe]");
  await swipe(p, "#reviews [data-swipe]");
  await scroll(p, 1400, 1600); await sleep(900);
  await rec.stop(); await p.close();
}
// 2. frame rate at 4× CPU throttle while scrolling the whole page, and layout shift
{
  const p = await phone();
  const cdp = await p.createCDPSession(); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.evaluateOnNewDocument(() => { window.__cls = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch (_) {} });
  await p.goto(BASE + "/", { waitUntil: "networkidle0" }); await sleep(1500);
  await p.evaluate(() => { window.__f = []; let last = performance.now(); const tick = (t) => { window.__f.push(t - last); last = t; if (window.__f.length < 100000) window.__raf = requestAnimationFrame(tick); }; window.__raf = requestAnimationFrame(tick); });
  const H = await p.evaluate(() => document.body.scrollHeight);
  await scroll(p, H, 9000);
  await swipe(p, "#sessions [data-swipe]");
  const r = await p.evaluate(() => { cancelAnimationFrame(window.__raf); const f = window.__f.slice(2); const avg = f.reduce((a, b) => a + b, 0) / f.length;
    return { frames: f.length, avgFps: +(1000 / avg).toFixed(1), p95ms: +f.slice().sort((a, b) => a - b)[Math.floor(f.length * .95)].toFixed(1), over33ms: f.filter((x) => x > 33.4).length, cls: +window.__cls.toFixed(4) }; });
  fs.writeFileSync(path.join(OUT, "fps-4x.json"), JSON.stringify(r, null, 2)); console.log(JSON.stringify(r));
  await p.close();
}
await b.close();
