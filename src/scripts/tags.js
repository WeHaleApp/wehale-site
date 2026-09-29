// Every tag on wehale.io, driven by environment variables (docs/ENV.md) and gated by consent (consent.js).
// A missing variable means that tag stays off; nothing non-essential is requested before the visitor says yes.
//
//   measurement consent -> Google Tag Manager (PUBLIC_GTM_ID), in Consent Mode v2 (GA fires only as consent allows)
//   ads consent         -> Meta Pixel (PUBLIC_META_PIXEL_ID) + Conversions API copy (META_CAPI_TOKEN, META_PIXEL_ID)
//                          TikTok Pixel (PUBLIC_TIKTOK_PIXEL_ID) + Events API copy (TIKTOK_EVENTS_TOKEN, TIKTOK_PIXEL_ID)
//
// Each event gets one event_id, shared by the pixel and its server copy, so Meta and TikTok de-duplicate them.
// Event names and params: docs/breathe/MEASUREMENT.md.
import { current, onChange } from "./consent.js";

const env = (v) => String(v || "").trim();
export const GTM_ID = env(import.meta.env.PUBLIC_GTM_ID);
export const META_PIXEL_ID = env(import.meta.env.PUBLIC_META_PIXEL_ID);
export const TIKTOK_PIXEL_ID = env(import.meta.env.PUBLIC_TIKTOK_PIXEL_ID);
const META_TEST_CODE = env(import.meta.env.PUBLIC_META_TEST_EVENT_CODE);
const TIKTOK_TEST_CODE = env(import.meta.env.PUBLIC_TIKTOK_TEST_EVENT_CODE);
/** Is anything configured to ask about? If not, the banner never shows. */
export const ANY_TAG = !!(GTM_ID || META_PIXEL_ID || TIKTOK_PIXEL_ID);

// The server copies are switched on at build time when their secrets exist (the layouts write only booleans).
const server = () => (typeof window !== "undefined" && window.__WH_SERVER) || {};
const META_CAPI_URL = "/.netlify/functions/meta-capi";
const TIKTOK_EVENTS_URL = "/.netlify/functions/tiktok-events";

// Meta standard events stay standard; the rest are custom. TikTok: the same names, except the two it has as
// standard events (ViewContent; the app tap as ClickButton). PageView is each pixel's own page call.
const META_STANDARD = new Set(["PageView", "ViewContent", "Lead"]);
const TIKTOK_NAME = { ViewContent: "ViewContent", AppTap: "ClickButton", Lead: null };

let loaded = { gtm: false, meta: false, tiktok: false };
let pageViewSent = false;

export function eventId() {
  try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function inject(src) {
  const s = document.createElement("script");
  s.async = true; s.src = src;
  (document.head || document.documentElement).appendChild(s);
}

function loadGtm() {
  if (loaded.gtm || !GTM_ID) return;
  loaded.gtm = true;
  const w = window;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  inject("https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(GTM_ID));
}

function loadMeta() {
  if (loaded.meta || !META_PIXEL_ID) return;
  loaded.meta = true;
  const w = window;
  if (!w.fbq) {   // Meta's standard base code, unminified
    const n = (w.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); });
    if (!w._fbq) w._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    inject("https://connect.facebook.net/en_US/fbevents.js");
  }
  w.fbq("init", META_PIXEL_ID);
}

function loadTikTok() {
  if (loaded.tiktok || !TIKTOK_PIXEL_ID) return;
  loaded.tiktok = true;
  const w = window;
  // TikTok's standard base code, unminified: a queue until events.js arrives
  const ttq = (w.ttq = w.ttq || []);
  ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
  ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
  for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
  ttq.instance = function (t) { const e = ttq._i[t] || []; for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
  ttq.load = function (id) {
    ttq._i = ttq._i || {}; ttq._i[id] = []; ttq._i[id]._u = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._t = ttq._t || {}; ttq._t[id] = +new Date(); ttq._o = ttq._o || {}; ttq._o[id] = {};
    inject("https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=" + encodeURIComponent(id) + "&lib=ttq");
  };
  ttq.load(TIKTOK_PIXEL_ID);
}

/** Loads what the current choice allows; safe to call again. */
export function applyConsent(state = current()) {
  if (!state) return;
  if (state.analytics || state.ads) loadGtm();
  if (state.ads) { loadMeta(); loadTikTok(); }
  if (state.ads && !pageViewSent && (loaded.meta || loaded.tiktok)) { pageViewSent = true; send("PageView", {}); }
}

let started = false;
/** Call once per page. */
export function startTags() {
  if (started || typeof window === "undefined") return;
  started = true;
  applyConsent();
  onChange((s) => applyConsent(s));
}

function readCookie(k) {
  const m = document.cookie.match(new RegExp("(?:^|; )" + k + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : undefined;
}
function testCode(param, fallback) {
  try { return new URLSearchParams(location.search).get(param) || fallback || undefined; } catch (_) { return fallback || undefined; }
}
function beacon(url, payload) {
  const body = JSON.stringify(payload);
  try {
    if (!(navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "application/json" })))) {
      fetch(url, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
    }
  } catch (_) {}
}

/**
 * One event to every tag the visitor allowed. Returns the event_id, or null when nothing may be sent.
 * params are flat strings/numbers (eventParams in contract.js).
 */
export function send(name, params = {}) {
  const st = current();
  if (!st || (!st.analytics && !st.ads)) return null;
  const id = eventId();
  if (loaded.gtm && name !== "PageView") window.dataLayer.push({ event: name, event_id: id, ...params });
  if (st.ads) {
    if (loaded.meta && window.fbq) window.fbq(META_STANDARD.has(name) ? "track" : "trackCustom", name, params, { eventID: id });
    if (META_PIXEL_ID && server().meta) {
      beacon(META_CAPI_URL, { event_name: name, event_id: id, custom_data: params, event_source_url: location.origin + location.pathname,
        consent: "granted", test_event_code: testCode("fbtest", META_TEST_CODE), fbp: readCookie("_fbp"), fbc: readCookie("_fbc") });
    }
    if (loaded.tiktok && window.ttq) {
      if (name === "PageView") window.ttq.page();
      else { const t = name in TIKTOK_NAME ? TIKTOK_NAME[name] : name; if (t) window.ttq.track(t, params, { event_id: id }); }
    }
    if (TIKTOK_PIXEL_ID && server().tiktok && !(name in TIKTOK_NAME && TIKTOK_NAME[name] === null)) {
      beacon(TIKTOK_EVENTS_URL, { event: name === "PageView" ? "Pageview" : name in TIKTOK_NAME ? TIKTOK_NAME[name] : name, event_id: id,
        properties: params, url: location.origin + location.pathname, consent: "granted",
        test_event_code: testCode("tttest", TIKTOK_TEST_CODE), ttp: readCookie("_ttp"), ttclid: testCode("ttclid") });
    }
  }
  if (window.__whDebug) window.__whDebug.push({ name, id, params });
  return id;
}
