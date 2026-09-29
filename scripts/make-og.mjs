// Open Graph images (1200×630) for each page, rendered from the site's own font and photos with headless Chrome.
//   node scripts/make-og.mjs   (writes public/assets/images/og/<page>.jpg)
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
const pub = path.resolve("public");
const font = "data:font/woff2;base64," + fs.readFileSync(path.join(pub, "fonts/nunito-sans-var.woff2")).toString("base64");
const img = (p) => "data:image/webp;base64," + fs.readFileSync(path.join(pub, p)).toString("base64");
const logo = "data:image/svg+xml;base64," + fs.readFileSync(path.join(pub, "assets/images/logo.svg")).toString("base64");
const PAGES = {
  home: { eyebrow: "Guided breathing · iPhone and Android", h: "Six minutes.<br>Breathe with Edvin.", bg: "assets/images/site/hero-eyes-1440.webp", pos: "62% 30%", side: true },
  about: { eyebrow: "About WeHale", h: "Built from<br>the breath up.", bg: "assets/images/site/forest-dawn-1440.webp", pos: "50% 60%" },
  support: { eyebrow: "Help", h: "Support", bg: "assets/images/site/forest-dawn-1440.webp", pos: "50% 60%" },
  investors: { eyebrow: "Investors", h: "Breathing for people<br>who don't meditate.", bg: "assets/images/site/forest-dawn-1440.webp", pos: "50% 60%" },
  legal: { eyebrow: "WeHale", h: "Guided breathing,<br>made in Varberg.", bg: "assets/images/site/forest-dawn-1440.webp", pos: "50% 60%" },
};
const b = await puppeteer.launch({ headless: "new", args: ["--mute-audio"] });
const page = await b.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
for (const [k, p] of Object.entries(PAGES)) {
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: N; src: url(${font}) format("woff2"); font-weight: 300 800; }
    html,body { margin:0; width:1200px; height:630px; background:#090f1d; color:#f2f0ed; font-family:N, sans-serif; overflow:hidden; }
    .bg { position:absolute; inset:0 ${p.side ? "0 0 38%" : "0"}; background:url(${img(p.bg)}) ${p.pos}/cover; }
    .sc { position:absolute; inset:0; background:${p.side ? "linear-gradient(90deg,#090f1d 38%,rgba(9,15,29,.55) 60%,rgba(9,15,29,.1))" : "linear-gradient(180deg,rgba(9,15,29,.55),rgba(9,15,29,.85))"}; }
    .t { position:absolute; left:80px; bottom:88px; }
    .e { font-size:20px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#45b5a0; }
    h1 { margin:18px 0 0; font-size:72px; line-height:1.05; font-weight:500; letter-spacing:-.015em; }
    img { position:absolute; left:80px; top:72px; height:30px; }
  </style></head><body><div class="bg"></div><div class="sc"></div><img src="${logo}"><div class="t"><div class="e">${p.eyebrow}</div><h1>${p.h}</h1></div></body></html>`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(pub, `assets/images/og/${k}.jpg`), type: "jpeg", quality: 82 });
}
await b.close();
console.log("ok");
