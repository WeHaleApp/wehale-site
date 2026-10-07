// One local run of the campaign page's measurement and its in-app fallback (docs/recharge/README.md). Needs `npx astro preview --port 4331`.
//   node scripts/check-campaign-events.mjs [base-url]
// Consent is set before load; every request to a tag host is blocked (pixels are keyless anyway); events are read from window.__whDebug,
// which tags.js fills with each event it would send. Prints what a visitor on a phone, on a desktop, in Instagram, and without consent would send.
import puppeteer from "puppeteer";
import DATA from "../src/data/recharge.json" with { type: "json" };
const BASE = (process.argv[2] || "http://127.0.0.1:4331").replace(/\/$/, ""), URL_ = `${BASE}/${DATA.route}`;
const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)";
const UA = { iphone: IOS + " Version/18.0 Mobile/15E148 Safari/604.1", instagram: IOS + " Mobile/15E148 Instagram 350.0.0.0.0 (iPhone14,5; iOS 18_0)" };
const b = await puppeteer.launch({ headless: "new" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(label, { ua, vp, consent, query = "?ch=influencer&c=anna-rc&utm_source=ig&utm_medium=social&utm_campaign=autumn&utm_content=story1", hash = "", click = false, tap2 }) {
  const ctx = await b.createBrowserContext(), p = await ctx.newPage(); await p.setViewport(vp);   // a fresh profile each run: no stored consent
  if (ua) await p.setUserAgent({ userAgent: ua });
  await p.setRequestInterception(true);
  const blocked = []; p.on("request", (r) => { const u = r.url(); if (!u.startsWith(BASE)) { blocked.push(new URL(u).host); r.abort(); } else r.continue(); });
  await p.evaluateOnNewDocument((c) => { window.__whDebug = []; try { if (c) localStorage.setItem("wehale.consent.v1", JSON.stringify({ analytics: true, ads: true, choice: "granted", at: new Date().toISOString(), v: 2 })); } catch (_) {} }, consent);
  await p.goto(URL_ + query + hash, { waitUntil: "load" }); await sleep(1200);
  if (consent === "late") { await p.evaluate(() => document.querySelector('[data-act="accept"]').click()); await sleep(600); }
  if (click) { await p.evaluate(() => { document.getElementById("ctaBtn").addEventListener("click", (e) => e.preventDefault()); document.getElementById("ctaBtn").click(); dispatchEvent(new Event("pagehide")); }); await sleep(300); }   // pagehide stands for the store or the app taking over
  const ev = await p.evaluate(() => window.__whDebug), hint = await p.evaluate(() => { const h = document.getElementById("inApp"); return h && !h.hidden ? document.getElementById("inAppText").textContent : null; });
  const store = await p.evaluate(() => Object.keys(localStorage)), cookies = (await p.cookies()).map((c) => c.name);
  console.log(`\n## ${label}\n events: ${ev.length ? "" : "(none)"}`); for (const e of ev) console.log("  ", e.name, JSON.stringify(e.params));
  console.log(" in-app hint:", hint, "| localStorage keys:", store.join(",") || "-", "| cookies set by the page:", cookies.join(",") || "none", "| blocked hosts:", [...new Set(blocked)].join(",") || "-");
  await p.close(); await ctx.close();
}
const phone = { width: 390, height: 844, isMobile: true, hasTouch: true }, desk = { width: 1280, height: 800 };
await run("phone, consent given, taps the button", { ua: UA.iphone, vp: phone, consent: true, click: true });
await run("desktop, consent given (the QR code; nothing to tap)", { vp: desk, consent: true });
await run("phone, no consent yet: nothing is sent", { ua: UA.iphone, vp: phone, consent: false });
await run("phone, consent given AFTER the page loaded: the view follows", { ua: UA.iphone, vp: phone, consent: "late" });
await run("Instagram's browser, hint is OFF in the data (today)", { ua: UA.instagram, vp: phone, consent: false });
await run("Instagram's browser with ?inapp=1 (the hint, previewed)", { ua: UA.instagram, vp: phone, consent: true, query: "?ch=influencer&c=anna-rc&inapp=1" });
await run("tester mode (#test=): nothing is measured", { ua: UA.iphone, vp: phone, consent: true, hash: "#test=ABC123" });
await b.close();
