/**
 * Capture wehale.io at desktop + mobile viewports, full page.
 * Run: node _audit-screenshots.mjs
 * Outputs to /tmp/wehale-audit/.
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";

const URLS = [
  { path: "/", label: "home" },
  { path: "/about", label: "about" },
  { path: "/investors", label: "investors" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, dpr: 1 },
  { name: "mobile", width: 390, height: 844, dpr: 2 },
];

mkdirSync("/tmp/wehale-audit", { recursive: true });

const browser = await puppeteer.launch({ headless: "new" });
for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: vp.dpr,
  });
  for (const u of URLS) {
    const url = `https://wehale.io${u.path}`;
    process.stdout.write(`${vp.name} ${u.label}... `);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    // Force-trigger scroll-reveal so elements far below the fold appear in
    // the full-page screenshot (otherwise they sit at opacity:0 because
    // IntersectionObserver hasn't fired for off-viewport content).
    await page.evaluate(() => {
      document
        .querySelectorAll("[data-reveal]")
        .forEach((el) => el.classList.add("is-visible"));
      // Scroll to bottom + back to top to trigger any lazy-loaded images
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise((r) => setTimeout(r, 800));
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 1200));
    const out = `/tmp/wehale-audit/${vp.name}-${u.label}.png`;
    await page.screenshot({ path: out, fullPage: true });
    console.log("done");
  }
  await page.close();
}
await browser.close();
console.log("All screenshots captured at /tmp/wehale-audit/");
