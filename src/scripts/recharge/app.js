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
  // the three directions while Isak chooses (2 Oct): ?look=a (the first screen), b (the pour), c (off-centre). a by default.
  const LOOK = (/[?&]look=([abcd])(&|$)/i.exec(location.search) || [, "a"])[1].toLowerCase();
  body.classList.add("rc-look-" + LOOK);
  // d: the light lives in a window of its own, the session as it appears in the app; the rest of the page is WeHale's own
  if (LOOK === "d" && $("rcStage") && $("plasma-hero")) $("rcStage").appendChild($("plasma-hero"));
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
  document.querySelectorAll(".rc-store").forEach((a) => { if (link) a.href = link; a.addEventListener("click", () => track.appTap(params({ completed: 0, at: "store-" + a.dataset.store }))); });
  if (DESK && link) drawQr(link);

  // the room the consent bar takes (from its top edge to the bottom), so the button and the fine print stay clear of it
  const whc = $("whConsent");
  const whcFit = () => { if (whc && !whc.hidden) body.style.setProperty("--rc-whc", Math.max(0, Math.ceil(innerHeight - whc.offsetTop)) + "px"); };
  if (whc) { new MutationObserver(() => requestAnimationFrame(whcFit)).observe(whc, { attributes: true, attributeFilter: ["hidden", "class"] }); addEventListener("resize", whcFit); whcFit(); }

  // the words wait for their font (no fallback flash), then arrive; the light mounts right after, so it never delays first paint
  let shown = false; const arrive = () => { if (shown) return; shown = true; body.classList.add("arrived"); mountLight(); };
  try { Promise.all(["500 32px 'Nunito Sans'", "700 18px 'Nunito Sans'"].map((f) => document.fonts.load(f))).then(arrive, arrive); } catch (_) { arrive(); }
  setTimeout(arrive, 700);
  window.__recharge = { link, look: LOOK };
}

async function drawQr(link) {
  try {
    const QR = (await import("qrcode")).default;
    $("qrCode").innerHTML = await QR.toString(link, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#090f1d", light: "#FFFFFF" } });
    $("qrBox").hidden = false; body.classList.add("rc-qr-on");
  } catch (_) { $("qrBox").hidden = true; }
}

// the app's own Plasma light (public/plasma/plasma-web.js, the Welcome's idle breath). The poster stays until the first drawn frame;
// without WebGL 2 (or on an error) the poster and its CSS glow simply stay: the page never depends on the light.
async function mountLight() {
  const hero = $("plasma-hero"); if (!hero) return;
  // the shape of the light while Isak chooses (?arms=calm|softer|disc): softer by default (the Design lead's pick)
  const ARMS = (/[?&]arms=(calm|softer|disc)(&|$)/i.exec(location.search) || [, "softer"])[1].toLowerCase();
  if (ARMS !== "softer") hero.querySelectorAll("source, img").forEach((el) => { if (el.srcset) el.srcset = el.srcset.replace("/softer/", "/" + ARMS + "/"); if (el.getAttribute("src")) el.src = el.getAttribute("src").replace("/softer/", "/" + ARMS + "/"); });
  const go = async () => {
    try {
      const url = "/plasma/plasma-web.js"; const { mount, isSupported } = await import(/* @vite-ignore */ url);
      if (!isSupported()) { hero.classList.add("fallback"); return; }
      const light = mount(hero, { look: "balanced", step: "welcome", reduceMotion: "auto", quality: "auto", arms: ARMS, heroScale: document.body.classList.contains("rc-look-d") ? 1 : "auto", interactive: false, onFallback: () => hero.classList.add("fallback") });
      requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add("live")));
      window.__plasma = light;
    } catch (_) { hero.classList.add("fallback"); }
  };
  if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 1200 }); else setTimeout(go, 150);
}

// the app carousel (look d): swipe or the arrows; the dots follow
(function () {
  const sl = document.getElementById("rcSlides"); if (!sl) return;
  const dots = [...document.querySelectorAll(".rc-dots b")];
  const at = () => Math.round(sl.scrollLeft / Math.max(1, sl.clientWidth));
  const sync = () => { const i = at(); dots.forEach((d, k) => d.classList.toggle("on", k === i)); };
  sl.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
  const go = (d) => sl.scrollTo({ left: Math.max(0, Math.min(dots.length - 1, at() + d)) * sl.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  document.querySelector(".rc-prev")?.addEventListener("click", () => go(-1));
  document.querySelector(".rc-next")?.addEventListener("click", () => go(1));
  sl.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); });
})();
