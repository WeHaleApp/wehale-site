// Automatic checks and screenshots for wehale.io (SITE-GOALS §6). Headless Chrome, sound muted, nothing submitted.
//   node scripts/check-site.mjs <base-url> <out-dir> [--shots]
// Checks per page and viewport: no tracking request before consent (network log), no horizontal scroll, tap targets
// ≥ 44 px (inline text links excepted), no clipped text, layout shift, every internal link resolves. Prints JSON.
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const BASE = (process.argv[2] || "http://127.0.0.1:4330").replace(/\/$/, "");
const OUT = process.argv[3] || "check-out";
const SHOTS = process.argv.includes("--shots");
fs.mkdirSync(OUT, { recursive: true });

const TRACKERS = /googletagmanager|google-analytics|doubleclick|facebook\.(net|com)|fbcdn|tiktok|analytics\.|pixel/i;
const VIEWPORTS = { m812: { width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  m667: { width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  d900: { width: 1440, height: 900, deviceScaleFactor: 1 } };
const PAGES = ["/", "/about", "/support", "/investors", "/credits", "/privacy", "/terms", "/this-is-not-a-page", "/breathe"];

const browser = await puppeteer.launch({ headless: "new", args: ["--mute-audio", "--autoplay-policy=user-gesture-required", "--no-first-run"] });
const report = { base: BASE, pages: {}, links: {}, failures: [] };
const internal = new Set();

async function open(url, vp, { reduced = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  if (vp.isMobile) await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }]);
  const requests = [];
  await page.setRequestInterception(true);
  // trackers are recorded and aborted; Netlify's deploy-preview drawer (/.netlify/scripts/cdp) is blocked so it doesn't cover the page
  page.on("request", (r) => { const u = r.url(); if (u.includes("/.netlify/scripts/cdp")) return r.abort(); requests.push(u); if (TRACKERS.test(new URL(u).hostname)) r.abort(); else r.continue(); });
  await page.evaluateOnNewDocument(() => {
    window.__cls = 0;
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch (_) {}
  });
  const res = await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  return { page, requests, status: res ? res.status() : 0 };
}

async function audit(page) {
  return page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05; };
    const inlineText = (el) => { const p = el.closest("p, li, dd, figcaption, td"); return !!p && p.textContent.trim().length > el.textContent.trim().length + 3; };
    const small = [];
    document.querySelectorAll("a[href], button, summary, input, select, textarea, [role=button], [role=slider]").forEach((el) => {
      if (!vis(el) || el.closest("[hidden], [aria-hidden=true]") || inlineText(el)) return;
      const r = el.getBoundingClientRect();
      if (r.height < 43.5 || r.width < 43.5) small.push({ el: el.outerHTML.slice(0, 120), w: Math.round(r.width), h: Math.round(r.height) });
    });
    const clipped = [];
    document.querySelectorAll("h1, h2, h3, p, a, button, span, li, dt, dd, figcaption, blockquote, b, small").forEach((el) => {
      if (!vis(el) || !el.textContent.trim() || el.getBoundingClientRect().width <= 2) return;   // screen-reader-only text
      const s = getComputedStyle(el);
      if ((s.overflow + s.overflowX).includes("hidden") && el.scrollWidth > el.clientWidth + 1) clipped.push(el.outerHTML.slice(0, 100));
      if (s.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) clipped.push(el.outerHTML.slice(0, 100));
    });
    const links = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
    return { hscroll: document.documentElement.scrollWidth > innerWidth + 1, scrollWidth: document.documentElement.scrollWidth, small, clipped, links,
      h1: [...document.querySelectorAll("h1")].filter(vis).map((h) => h.textContent.trim()), cls: +window.__cls.toFixed(4), title: document.title };
  });
}

for (const p of PAGES) {
  for (const [vk, vp] of Object.entries(VIEWPORTS)) {
    if (vk === "m667" && !["/", "/about", "/breathe"].includes(p)) continue;
    const { page, requests, status } = await open(BASE + p, vp);
    await new Promise((r) => setTimeout(r, 1600));
    const a = await audit(page);
    const trackers = requests.filter((u) => TRACKERS.test(new URL(u).hostname));
    const key = `${p} ${vk}`;
    report.pages[key] = { status, trackers, ...a, links: undefined };
    a.links.forEach((h) => { if (h && h.startsWith("/") ) internal.add(h.split("#")[0] || "/"); });
    if (trackers.length) report.failures.push(`${key}: tracking request before consent: ${trackers[0]}`);
    if (a.hscroll) report.failures.push(`${key}: horizontal scroll (${a.scrollWidth}px)`);
    if (a.small.length) report.failures.push(`${key}: ${a.small.length} tap target(s) under 44 px, e.g. ${a.small[0].el} ${a.small[0].w}x${a.small[0].h}`);
    if (a.clipped.length) report.failures.push(`${key}: clipped text, e.g. ${a.clipped[0]}`);
    if (a.cls > 0.01) report.failures.push(`${key}: layout shift ${a.cls}`);
    if (p !== "/this-is-not-a-page" && !(status >= 200 && status < 400)) report.failures.push(`${key}: status ${status}`);
    if (p === "/this-is-not-a-page" && status !== 404) report.failures.push(`${key}: the 404 page answered ${status}`);
    if (SHOTS) {
      const name = (p === "/" ? "home" : p.slice(1).replace(/\//g, "-")) + "-" + vk;
      await page.screenshot({ path: path.join(OUT, name + ".png") });
    }
    await page.close();
  }
}

// every internal link resolves
for (const h of internal) {
  const r = await fetch(BASE + h, { redirect: "manual" });
  report.links[h] = r.status;
  if (r.status >= 400) report.failures.push(`link ${h}: ${r.status}`);
}

// the consent banner (?consent=1 shows it for review even with no tag configured)
for (const [vk, vp] of Object.entries(VIEWPORTS)) {
  for (const p of ["/", "/breathe"]) {
    const { page, requests } = await open(BASE + p + "?consent=1", vp);
    await new Promise((r) => setTimeout(r, 1400));
    const shown = await page.$eval("#whConsent", (el) => !el.hidden && el.getBoundingClientRect().height > 0).catch(() => false);
    if (!shown) report.failures.push(`consent ${p} ${vk}: banner not shown with ?consent=1`);
    const sizes = await page.$$eval("#whConsent .whc-b", (bs) => bs.filter((b) => b.offsetParent).map((b) => [Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)]));
    if (sizes.length === 2 && (sizes[0][0] !== sizes[1][0] || sizes[0][1] !== sizes[1][1])) report.failures.push(`consent ${p} ${vk}: Accept and Decline differ in size ${JSON.stringify(sizes)}`);
    if (SHOTS) await page.screenshot({ path: path.join(OUT, `consent-${p === "/" ? "home" : "breathe"}-${vk}.png`) });
    if (SHOTS && p === "/") {
      await page.$eval("#whConsent [data-act=settings]", (b) => b.click()); await new Promise((r) => setTimeout(r, 700));
      await page.screenshot({ path: path.join(OUT, `consent-settings-${vk}.png`) });
    }
    const trackers = requests.filter((u) => TRACKERS.test(new URL(u).hostname));
    if (trackers.length) report.failures.push(`consent ${p} ${vk}: tracking request before a choice: ${trackers[0]}`);
    await page.close();
  }
}

// full pages for the judges (Reduce Motion, so every section is visible)
if (SHOTS) {
  for (const p of ["/", "/about"]) for (const vk of ["m812", "d900"]) {
    const { page } = await open(BASE + p, VIEWPORTS[vk], { reduced: true });
    // scroll through once so lazy images load, then back to the top
    await page.evaluate(async () => { const c = document.getElementById("whConsent"); if (c) c.hidden = true; document.querySelectorAll("img[loading=lazy]").forEach((i) => { i.loading = "eager"; }); for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(OUT, `${p === "/" ? "home" : "about"}-${vk}-full.png`), fullPage: true });
    await page.close();
  }
}

// arrivals from the four ads (/breathe with the hook), and the home hero's landscape variant
if (SHOTS) {
  for (const h of ["parked", "coffee", "keepup", "night"]) for (const vk of ["m812", "m667"]) {
    const { page } = await open(`${BASE}/breathe?h=${h}&hint=0&utm_source=meta&utm_content=${h}`, VIEWPORTS[vk]);
    await new Promise((r) => setTimeout(r, 1800));
    await page.screenshot({ path: path.join(OUT, `ad-breathe-${h}-${vk}.png`) });
    await page.close();
  }
  for (const vk of ["m812", "d900"]) {
    const { page } = await open(`${BASE}/?v=hero-landscape`, VIEWPORTS[vk]);
    await new Promise((r) => setTimeout(r, 1600));
    await page.screenshot({ path: path.join(OUT, `home-landscape-${vk}.png`) });
    await page.close();
  }
}

await browser.close();
fs.writeFileSync(path.join(OUT, "checks.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ failures: report.failures, links: report.links }, null, 2));
