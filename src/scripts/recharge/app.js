// The campaign page's controller (src/pages/[campaign].astro): one "get the app" page. It sets this visit's OneLink
// (the channel and its code, link.js) on "Get the app", and on a desktop shows a QR code of the same link instead.
// Waits for the gate (window.__rcGate); nothing loads or measures on a page that turned into the 404.
import DATA from "../../data/recharge.json";
import { readCampaign, campaignLink, phoneOf } from "./link.js";
import { initMeasurement, track } from "../breathe/measure.js";
import { eventParams } from "../contract.js";

const $ = (id) => document.getElementById(id);
const body = document.body;

(window.__rcGate || Promise.resolve(true)).then((open) => { if (open) run(); });

function run() {
  const CAMP = readCampaign(location.search, document.referrer, DATA);
  const PHONE = phoneOf(navigator.userAgent, navigator.maxTouchPoints || 0);
  const DESK = !PHONE && matchMedia("(hover: hover) and (pointer: fine) and (min-width: 700px)").matches;
  body.classList.add("rc");
  // preview of the bloom look (owner of main, 1 Oct): ?look=bloom puts cover B2 under the words; Isak picks ring or bloom
  if (/[?&]look=bloom(&|$)/.test(location.search)) body.classList.add("rc-bloom");
  body.classList.toggle("rc-desk", DESK);
  body.dataset.phone = PHONE || "desktop";

  // every event: the contract, plus the campaign's own fields (no personal data; the code is a campaign code)
  const params = (extra = {}) => eventParams(CAMP.contract, { session: DATA.session.slug, page: "recharge", campaign: DATA.onelink.c, ch: CAMP.ch, code: CAMP.code, arm: "none", ...extra });
  initMeasurement();

  // "Get the app": the OneLink with this visit's channel and code; on a desktop, a QR code of the same link instead
  const link = campaignLink(DATA, { ...CAMP, at: DESK ? "qr" : "offer" });
  const cta = $("ctaBtn");
  if (link) cta.href = link;
  cta.addEventListener("click", () => track.appTap(params({ completed: 0, at: "offer" })));
  if (DESK && link) drawQr(link);

  // the room the consent bar takes (from its top edge to the bottom), so the button and the fine print stay clear of it
  const whc = $("whConsent");
  const whcFit = () => { if (whc && !whc.hidden) body.style.setProperty("--rc-whc", Math.max(0, Math.ceil(innerHeight - whc.offsetTop)) + "px"); };
  if (whc) { new MutationObserver(() => requestAnimationFrame(whcFit)).observe(whc, { attributes: true, attributeFilter: ["hidden", "class"] }); addEventListener("resize", whcFit); whcFit(); }

  // the words wait for their font (no fallback flash), then rise in
  // then the room comes alive: the orb, its ripples and the button breathe from this moment, and the motes (a small
  // canvas, loaded now so it never delays the first paint) rise on the same clock; nothing with Reduce Motion
  let shown = false; const arrive = () => { if (shown) return; shown = true; body.classList.add("arrived");
    const t0 = document.timeline && document.timeline.currentTime != null ? document.timeline.currentTime : performance.now();
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) import("./motes.js").then((m) => m.startMotes($("rcMotes"), $("rcOrb"), t0), () => {}); };
  try { Promise.all(["500 32px 'Nunito Sans'", "700 18px 'Nunito Sans'"].map((f) => document.fonts.load(f))).then(arrive, arrive); } catch (_) { arrive(); }
  setTimeout(arrive, 700);
  window.__recharge = { link };
}

async function drawQr(link) {
  try {
    const QR = (await import("qrcode")).default;
    $("qrCode").innerHTML = await QR.toString(link, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#090f1d", light: "#FFFFFF" } });
    $("qrBox").hidden = false; body.classList.add("rc-qr-on");
  } catch (_) { $("qrBox").hidden = true; }
}
