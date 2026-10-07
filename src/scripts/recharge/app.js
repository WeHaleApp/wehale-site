// The campaign page's controller (src/pages/[campaign].astro): one "get the app" page. It sets this visit's OneLink
// (the channel and its code, link.js) on "Get the app", and on a desktop shows a QR code of the same link instead.
import DATA from "../../data/recharge.json";
import { readCampaign, campaignLink, phoneOf, testCodeFrom, quickStartLink } from "./link.js";
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
  const TEST = quickStartLink(testCodeFrom(location.hash));
  const link = TEST || campaignLink(DATA, { ...CAMP, at: DESK ? "qr" : "offer" });
  const cta = $("ctaBtn");
  if (link) cta.href = link;
  if (TEST) {
    body.classList.add("rc-test");
    cta.textContent = "Open in the test build";
    const cap = document.querySelector("#qrBox figcaption"); if (cap) cap.textContent = "Test build: scan with your phone's camera, then tap Open.";
    document.querySelectorAll(".rc-how").forEach((el) => { el.textContent = "For the team: the link only works for the team test code, in a test build, and signs you in to a test account."; });
  } else {
    cta.addEventListener("click", () => track.appTap(params({ completed: 0, at: "offer" })));

  }
  if (DESK && link) drawQr(link);

  // the room the consent bar takes (from its top edge to the bottom), so the button and the fine print stay clear of it
  const whc = $("whConsent");
  const whcFit = () => { if (whc && !whc.hidden) body.style.setProperty("--rc-whc", Math.max(0, Math.ceil(innerHeight - whc.offsetTop)) + "px"); };
  if (whc) { new MutationObserver(() => requestAnimationFrame(whcFit)).observe(whc, { attributes: true, attributeFilter: ["hidden", "class"] }); addEventListener("resize", whcFit); whcFit(); }

  startInk();
  window.__recharge = { link };
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
