/**
 * Section-by-section audit captures of the live site.
 * Scrolls each section into view, takes a 1440x900 (desktop) or 390x844 (mobile)
 * viewport-size shot. Cleaner + more readable than fullPage stitches.
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";

const SECTIONS = [
  { id: "top", label: "hero" },
  { id: "practice", label: "pillars" },
  { id: "sessions", label: "use-cases" },
  { id: "product", label: "phone-slider" },
  { id: "why", label: "why" },
  { id: "stories", label: "stories" },
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
  await page.goto("https://wehale.io/", { waitUntil: "networkidle2", timeout: 30000 });
  // Force-trigger reveal animations so off-fold elements appear.
  await page.evaluate(() => {
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
  });
  await new Promise((r) => setTimeout(r, 400));

  for (const s of SECTIONS) {
    await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    }, s.id);
    await new Promise((r) => setTimeout(r, 600));
    const out = `/tmp/wehale-audit/r3-${vp.name}-${s.label}.png`;
    await page.screenshot({ path: out });
    process.stdout.write(`${vp.name} ${s.label}... `);
  }
  console.log("");

  // Top + bottom captures for header/footer
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `/tmp/wehale-audit/r3-${vp.name}-top.png` });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `/tmp/wehale-audit/r3-${vp.name}-bottom.png` });

  await page.close();
}

await browser.close();
console.log("Captures: /tmp/wehale-audit/r3-*.png");
