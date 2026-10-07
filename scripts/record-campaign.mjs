// Muted recordings, stills and a frame-rate check of the campaign page (src/pages/[campaign].astro) on a local build.
//   node scripts/record-campaign.mjs <base-url> <out-dir> [--video] [--fps]
// The key comes from the environment only (never argv, never printed). Consent is answered (declined) before load.
// --video: phone 375×812 @2×, desktop 1440×900 and the phone with Reduce Motion, 9 s each (WebM, then H.264 via ffmpeg).
// --fps:   rAF frame times over 8 s on the phone at 4× CPU throttle, first contentful paint, and layout shift.
import puppeteer from "puppeteer";
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import DATA from "../src/data/recharge.json" with { type: "json" };
const BASE = (process.argv[2] || "http://127.0.0.1:4330").replace(/\/$/, ""), OUT = process.argv[3] || "campaign-out";
const URL_ = `${BASE}/${DATA.route}`;
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: "new", args: ["--mute-audio", "--autoplay-policy=user-gesture-required", "--no-first-run"] });
const VP = { mobile: { width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, desktop: { width: 1440, height: 900, deviceScaleFactor: 1 } };
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

async function open(kind, { reduced = false, throttle = 0 } = {}) {
  const p = await b.newPage();
  await p.setViewport(VP[kind]);
  if (kind === "mobile") await p.setUserAgent(IPHONE);
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }]);
  await p.setRequestInterception(true); p.on("request", (r) => (r.url().includes("/.netlify/") ? r.abort() : r.continue()));
  await p.evaluateOnNewDocument(() => {
    try { localStorage.setItem("wehale.consent.v1", JSON.stringify({ analytics: false, ads: false, choice: "denied", at: new Date().toISOString(), v: 2 })); } catch (_) {}
    window.__cls = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch (_) {}
  });
  if (throttle) { const cdp = await p.createCDPSession(); await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle }); }
  return p;
}
// Headless Chrome can't screencast at device pixels, and full-size screenshots come at ~20 a second. So the page's
// clock is slowed to a quarter (CDP Animation.setPlaybackRate: the CSS animations and document.timeline, which the
// motes canvas runs on), device-pixel screenshots are taken as fast as they come and stamped with the page's own time,
// and ffmpeg lays them onto a constant 30 fps at real speed (H.264). The motion is the page's, only the capture is slow.
const RATE = 0.25;
async function record(p, url, ms, out, dim) {
  const cdp = await p.createCDPSession(), dir = out + ".frames"; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  await cdp.send("Animation.enable"); await cdp.send("Animation.setPlaybackRate", { playbackRate: RATE });
  await p.goto(url, { waitUntil: "domcontentloaded" });
  await cdp.send("Animation.setPlaybackRate", { playbackRate: RATE });
  const clock = () => p.evaluate(() => document.timeline.currentTime);
  const stamps = []; let t0 = null;
  for (;;) {
    const a = await clock(); const shot = await p.screenshot({ type: "jpeg", quality: 94, optimizeForSpeed: true }); const b2 = await clock();
    const t = (a + b2) / 2; if (t0 === null) t0 = t;
    fs.writeFileSync(path.join(dir, `${String(stamps.length).padStart(5, "0")}.jpg`), shot); stamps.push(t - t0);
    if (t - t0 >= ms) break;
  }
  const lines = [];
  stamps.forEach((t, i) => { const next = i + 1 < stamps.length ? stamps[i + 1] : t + 34; lines.push(`file '${String(i).padStart(5, "0")}.jpg'`, `duration ${Math.max(0.001, (next - t) / 1000).toFixed(4)}`); });
  lines.push(`file '${String(stamps.length - 1).padStart(5, "0")}.jpg'`);
  fs.writeFileSync(path.join(dir, "list.txt"), lines.join("\n"));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"), "-an", "-vf", `fps=30,scale=${dim[0]}:${dim[1]}:flags=lanczos,format=yuv420p`, "-t", String(ms / 1000),
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-r", "30", "-movflags", "+faststart", out]);
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
  if (!process.env.KEEP_FRAMES) fs.rmSync(dir, { recursive: true });
  return stamps.length;
}

if (process.argv.includes("--video")) {
  for (const [name, kind, reduced] of [["landing-motion-mobile", "mobile", false], ["landing-motion-desktop", "desktop", false], ["landing-motion-mobile-reduced-motion", "mobile", true]]) {
    const p = await open(kind, { reduced });
    const dim = kind === "mobile" ? [750, 1624] : [1440, 900];
    // the recording starts before the (gated) page loads, so the entrance is in it
    const n = await record(p, URL_, 9000, path.join(OUT, name + ".mp4"), dim);
    console.log(name, n, "source frames");
    await p.close();
  }
}
if (process.argv.includes("--fps")) {
  const p = await open("mobile", { throttle: 4 });
  await p.goto(URL_, { waitUntil: "networkidle0" }); await sleep(1500);
  const r = await p.evaluate(() => new Promise((res) => { const f = []; let last = performance.now(); const t0 = last;
    const tick = (t) => { f.push(t - last); last = t; if (t - t0 < 8000) requestAnimationFrame(tick); else { const g = f.slice(2), avg = g.reduce((a, b) => a + b, 0) / g.length, s = g.slice().sort((a, b) => a - b);
      const fcp = performance.getEntriesByName("first-contentful-paint")[0];
      res({ frames: g.length, avgFps: +(1000 / avg).toFixed(1), p95ms: +s[Math.floor(s.length * .95)].toFixed(1), over33ms: g.filter((x) => x > 33.4).length, fcpMs: fcp ? Math.round(fcp.startTime) : null, cls: +window.__cls.toFixed(4) }); } };
    requestAnimationFrame(tick); }));
  fs.writeFileSync(path.join(OUT, "fps-4x.json"), JSON.stringify(r, null, 2)); console.log(JSON.stringify(r));
  await p.close();
}
// first paint on a mid phone: 4× CPU throttle and a slow 4G link (150 ms RTT, 1.6 Mbit/s), cold cache; when the
// words have arrived (body.arrived) as well as the browser's first contentful paint
if (process.argv.includes("--paint")) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
    await p.setViewport(VP.mobile); await p.setUserAgent(IPHONE);
    await p.evaluateOnNewDocument(() => { try { localStorage.setItem("wehale.consent.v1", JSON.stringify({ analytics: false, ads: false, choice: "denied", at: new Date().toISOString(), v: 2 })); } catch (_) {}
      window.__cls = 0; const poll = () => { if (document.body && document.body.classList.contains("arrived")) window.__arr = performance.now(); else requestAnimationFrame(poll); }; requestAnimationFrame(poll); try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch (_) {} });
    const cdp = await p.createCDPSession(); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
    await p.goto(URL_, { waitUntil: "networkidle0", timeout: 60000 }); await sleep(3000);
    out.push(await p.evaluate(() => ({ fcp: Math.round((performance.getEntriesByName("first-contentful-paint")[0] || {}).startTime || 0), arrived: Math.round(window.__arr || 0), cls: +window.__cls.toFixed(4) })));
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, "paint-mid-phone.json"), JSON.stringify(out, null, 2)); console.log(JSON.stringify(out));
}
await b.close();
