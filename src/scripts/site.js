// The site's pages (not /breathe): the ad-to-site contract on every link, the smart "Get the app" link, the events,
// the header and the reveals. Tags load only after consent (tags.js, via the consent banner).
import { readContract, eventParams, carryHref, oneLinkUrl } from "./contract.js";
import { send } from "./tags.js";
import { ONELINK_BASE } from "./breathe/config.js";

const SITE_PID = "website", SITE_CAMPAIGN = "site";
const html = document.documentElement;
const contract = readContract(location.search, document.referrer);
const page = html.dataset.page || "page";
const variant = html.dataset.v || contract.v || "0";   // the variant actually shown (home: eyes | land)
const params = (extra) => eventParams(contract, { page, v: variant, ...extra });

// ---- the contract passes on: internal links keep h, s, v, src and the utm_* (so /breathe knows the ad) ----
const carries = Object.keys(contract).some((k) => k !== "source");
if (carries) {
  document.querySelectorAll("a[href^='/']").forEach((a) => {
    const href = a.getAttribute("href");
    if (/^\/(privacy|terms|credits)/.test(href)) return;   // legal pages don't need it
    a.setAttribute("href", carryHref(href, contract, location.origin));
  });
}

// ---- the smart link: the OneLink on phones, the QR sheet on desktop ----
export function appLink(at) {
  return oneLinkUrl(ONELINK_BASE, { pid: SITE_PID, campaign: SITE_CAMPAIGN, contract, session: contract.s, at, v: variant });
}
const desktop = () => matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)").matches;
const sheet = document.getElementById("getApp");
async function openSheet(at) {
  if (!sheet) return;
  const box = sheet.querySelector("[data-qr]");
  const url = appLink("qr_" + at);
  try {
    const QR = (await import("qrcode")).default;
    box.innerHTML = await QR.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#090f1d", light: "#f2f0ed" } });
  } catch (_) { box.textContent = ""; }
  if (typeof sheet.showModal === "function") sheet.showModal(); else sheet.setAttribute("open", "");
}
sheet?.addEventListener("click", (e) => { if (e.target === sheet || e.target.closest("[data-close]")) sheet.close(); });

document.querySelectorAll("[data-get-app]").forEach((a) => {
  const at = a.dataset.at || "page";
  const link = appLink(at);
  if (link) a.setAttribute("href", link);
  a.addEventListener("click", (e) => {
    send("AppTap", params({ at, store: "onelink" })); send("Lead", params({ at, store: "onelink", content_name: "app" }));
    if (desktop() || !link) { e.preventDefault(); openSheet(at); }
    a.closest("details")?.removeAttribute("open");
  });
});
document.querySelectorAll("[data-store]").forEach((a) => a.addEventListener("click", () => {
  const p = params({ at: a.dataset.at || "page", store: a.dataset.store });
  send("AppTap", p); send("Lead", { ...p, content_name: "app" });
}));
document.querySelectorAll("[data-try]").forEach((a) => a.addEventListener("click", () => send("TrySessionTap", params({ at: a.dataset.at || "page" }))));

// ---- reveals: once per group, on the app's enter curve; Reduce Motion gets still pages ----
const els = document.querySelectorAll("[data-reveal]");
if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
  els.forEach((el) => el.classList.add("is-visible"));
} else {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  els.forEach((el) => io.observe(el));
}

// ---- header: transparent over the hero, solid once scrolled; on phones it steps aside while reading down ----
const hdr = document.querySelector("[data-header]");
let lastY = scrollY;
const small = matchMedia("(max-width: 767px)");
const onScroll = () => {
  if (!hdr) return;
  const y = scrollY;
  hdr.dataset.solid = y > 24 || html.dataset.solidHeader === "true" ? "true" : "false";
  if (small.matches && !hdr.querySelector("details[open]")) {
    if (y > lastY + 4 && y > 320) hdr.classList.add("-translate-y-full");
    else if (y < lastY - 4 || y < 120) hdr.classList.remove("-translate-y-full");
  }
  lastY = y;
};
addEventListener("scroll", onScroll, { passive: true }); onScroll();
// the phone menu closes on a tap outside it
document.addEventListener("click", (e) => { const d = hdr?.querySelector("details[open]"); if (d && !d.contains(e.target)) d.removeAttribute("open"); });

window.__whSite = { contract, appLink, params };
