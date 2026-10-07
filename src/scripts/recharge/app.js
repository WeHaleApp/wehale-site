// The campaign page's controller (src/pages/[campaign].astro): one "get the app" page. It sets this visit's OneLink
// (the channel and its code, link.js) on "Get the app", and on a desktop shows a QR code of the same link instead.
import DATA from "../../data/recharge.json";
import { readCampaign, campaignLink, phoneOf, testCodeFrom, quickStartLink, inAppBrowser } from "./link.js";
import { onChange } from "../consent.js";
import { initMeasurement, track } from "../breathe/measure.js";
import { eventParams } from "../contract.js";

const $ = (id) => document.getElementById(id);
const body = document.body;

run();

function run() {
  const CAMP = readCampaign(location.search, document.referrer, DATA);
  const PHONE = phoneOf(navigator.userAgent, navigator.maxTouchPoints || 0);
  const DESK = !PHONE && matchMedia("(hover: hover) and (pointer: fine) and (min-width: 700px)").matches;
  body.classList.add("rc");
  body.classList.toggle("rc-desk", DESK);
  body.dataset.phone = PHONE || "desktop";

  // every event: the contract, plus the campaign's own fields (no personal data; the code is a campaign code)
  const params = (extra = {}) => eventParams(CAMP.contract, { session: DATA.session.slug, page: "recharge", campaign: DATA.onelink.c, ch: CAMP.ch, code: CAMP.code, arm: "none", ...extra });
  if (!testCodeFrom(location.hash)) initMeasurement();

  // "Get the app": the OneLink with this visit's channel and code; on a desktop, a QR code of the same link instead
  // Tester mode (#test=<team test code>): the quick-start link of the TestFlight build instead of the store link, on a desktop as the QR code. Nothing is measured.
  const INAPP = inAppBrowser(navigator.userAgent);
  const TEST = quickStartLink(testCodeFrom(location.hash));
  const link = TEST || campaignLink(DATA, { ...CAMP, at: DESK ? "qr" : "offer" });
  const cta = $("ctaBtn");
  if (link) cta.href = link;
  if (TEST) {
    body.classList.add("rc-test");
    cta.textContent = "Open in the test build";
    document.querySelectorAll(".rc-how").forEach((el) => { el.textContent = "For the team: the link only works for the team test code, in a test build, and signs you in to a test account."; });
  } else {
    // the funnel (docs/recharge/README.md "Measurement"): CampaignView on arrival, AppTap (+Lead) on the button, StoreOpened (inferred) if the page is
    // hidden within 5 s of the tap. Each goes only after consent; a view that arrives before the answer is sent when the answer comes.
    const base = { at: DESK ? "qr" : "offer", device: PHONE || "desktop", inapp: INAPP ? INAPP.name : "none" };
    if (!track.campaignView(params(base))) { const off = onChange(() => { if (track.campaignView(params(base))) off && off(); }); }
    cta.addEventListener("click", () => {
      track.appTap(params({ completed: 0, at: "offer", device: base.device, inapp: base.inapp }));
      const t0 = Date.now(), gone = () => { if (Date.now() - t0 < 5000) track.storeOpened(params({ at: "offer", device: base.device, inapp: base.inapp, inferred: 1 })); };
      addEventListener("pagehide", gone, { once: true });
      document.addEventListener("visibilitychange", () => { if (document.hidden) gone(); }, { once: true });
    });

  }
  if (DESK && link) drawQr(link);
  inAppHint(INAPP, !!TEST, params);

  // the room the consent bar takes (from its top edge to the bottom), so the button and the fine print stay clear of it
  const whc = $("whConsent");
  const whcFit = () => { if (whc && !whc.hidden) body.style.setProperty("--rc-whc", Math.max(0, Math.ceil(innerHeight - whc.offsetTop)) + "px"); };
  if (whc) { new MutationObserver(() => requestAnimationFrame(whcFit)).observe(whc, { attributes: true, attributeFilter: ["hidden", "class"] }); addEventListener("resize", whcFit); whcFit(); }

  startInk();
  window.__recharge = { link };
}

// Inside another app's own browser: a quiet way out, and the copy-link button. Off until Isak picks the words (recharge.json inapp.on);
// ?inapp=1 previews it anywhere.
function inAppHint(inapp, test, params) {
  const box = $("inApp"); if (!box || test) return;
  const preview = /[?&]inapp=1(&|$)/.test(location.search);
  if (!((DATA.inapp.on && inapp) || preview)) return;
  const os = inapp ? inapp.os : phoneOf(navigator.userAgent, navigator.maxTouchPoints || 0);
  const browser = os === "ios" ? "Safari" : os === "android" ? "Chrome" : "your browser", app = inapp ? inapp.name : "Instagram";
  $("inAppText").textContent = box.dataset.text.replace("{app}", app).replace("{browser}", browser);
  box.hidden = false;
  const ev = { device: os || "desktop", inapp: app };
  if (!track.inAppHint(params(ev))) { const off = onChange(() => { if (track.inAppHint(params(ev))) off && off(); }); }
  const btn = $("inAppCopy");
  btn.addEventListener("click", async () => {
    const url = location.origin + location.pathname + location.search;
    try { await navigator.clipboard.writeText(url); } catch (_) { const t = document.createElement("textarea"); t.value = url; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (__) {} t.remove(); }
    $("inAppText").textContent = box.dataset.copied.replace("{browser}", browser); btn.hidden = true;
    track.inAppCopy(params(ev));
  });
}

async function drawQr(link) {
  try {
    const QR = (await import("qrcode")).default;
    $("qrCode").innerHTML = await QR.toString(link, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#090f1d", light: "#FFFFFF" } });
    body.classList.add("rc-qr-on");
  } catch (_) { /* the pill is hidden on a desktop only by CSS; the link below the words stays */ }
}

// The ink loop: the poster is already the picture; the video is added once the page has loaded, never for Reduce Motion or
// Save-Data, and fades in over the poster when it plays. Any failure leaves the poster, which is a complete page.
function startInk() {
  const ink = document.querySelector(".rc-ink"), v = ink && ink.querySelector("video");
  const conn = navigator.connection || {};
  if (!v || matchMedia("(prefers-reduced-motion: reduce)").matches || conn.saveData) return;
  const go = () => {
    v.src = v.dataset.src; v.load();
    v.addEventListener("playing", () => ink.classList.add("playing"), { once: true });
    const p = v.play(); if (p && p.catch) p.catch(() => {});
    document.addEventListener("visibilitychange", () => { if (document.hidden) v.pause(); else v.play().catch(() => {}); });
  };
  const idle = () => ("requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 400));
  if (document.readyState === "complete") idle(); else addEventListener("load", idle, { once: true });
}
