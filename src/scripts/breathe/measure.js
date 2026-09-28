// Measurement for /breathe: consent first, then the Meta Pixel (and, if approved, the Conversions API).
// - Nothing non-essential loads before "Accept". Decline, or no answer, means no pixel and no server events.
// - The pixel script is requested only when consent is granted AND a pixel ID is configured (config.js).
// - Every event gets an event_id, shared by the pixel and the server event, so Meta de-duplicates them.
// - No personal data is sent: no email, phone or name; the server adds IP and user agent only as Meta requires.
// See docs/breathe/MEASUREMENT.md for the event table and the test plan.
import { META_PIXEL_ID, META_CAPI_URL, META_TEST_EVENT_CODE, CONSENT_KEY } from "./config.js";

const listeners = new Set();
let pixelLoaded = false;
let pageViewSent = false;

// ---- consent (localStorage, no cookie) ----
export function getConsent() {
  try {
    const o = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
    return o && (o.choice === "granted" || o.choice === "denied") ? o.choice : null;
  } catch (_) {
    return null; // storage blocked (private mode, in-app browser settings): treat as no answer
  }
}
export function setConsent(choice) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, at: new Date().toISOString(), v: 1 }));
  } catch (_) { /* the choice still applies for this page view */ }
  memo = choice;
  listeners.forEach((f) => f(choice));
  if (choice === "granted") loadPixel();
}
let memo = null;
export const consent = () => memo || getConsent();
export const onConsent = (f) => listeners.add(f);

// ---- ids ----
export function eventId() {
  try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

// ---- Meta Pixel: only after consent and only with an ID ----
function loadPixel() {
  if (pixelLoaded || !META_PIXEL_ID || consent() !== "granted") return;
  pixelLoaded = true;
  /* Meta's standard base code, unminified; it requests https://connect.facebook.net/en_US/fbevents.js */
  const w = window;
  if (!w.fbq) {
    const n = (w.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); });
    if (!w._fbq) w._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    const s = document.createElement("script");
    s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  }
  w.fbq("init", META_PIXEL_ID);
  if (!pageViewSent) { pageViewSent = true; send("PageView", {}, { standard: true }); }
}

function testCode() {
  try { return new URLSearchParams(location.search).get("fbtest") || META_TEST_EVENT_CODE; } catch (_) { return META_TEST_EVENT_CODE; }
}

// ---- one event: pixel + (optional) server beacon with the same event_id ----
function send(name, params, { standard = false } = {}) {
  if (consent() !== "granted") return null;
  const id = eventId();
  if (META_PIXEL_ID && window.fbq) {
    window.fbq(standard ? "track" : "trackCustom", name, params, { eventID: id });
  }
  if (META_CAPI_URL) {
    const body = JSON.stringify({
      event_name: name, event_id: id, custom_data: params, event_source_url: location.origin + location.pathname,
      consent: "granted", test_event_code: testCode() || undefined,
      fbp: readCookie("_fbp"), fbc: readCookie("_fbc"),
    });
    try {
      if (!(navigator.sendBeacon && navigator.sendBeacon(META_CAPI_URL, new Blob([body], { type: "application/json" })))) {
        fetch(META_CAPI_URL, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
      }
    } catch (_) {}
  }
  if (window.__breatheDebug) window.__breatheDebug.push({ name, id, params });
  return id;
}
// the pixel's own first-party cookies (set by fbevents.js after consent); read only to pass on for matching
function readCookie(k) {
  const m = document.cookie.match(new RegExp("(?:^|; )" + k + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : undefined;
}

// ---- the funnel ----
// Custom events carry {session, arm, source}; ViewContent (on start) and Lead (on the app tap) are the standard
// events Meta can optimise for.
export const track = {
  picked: (p) => send("SessionPicked", p),
  start: (p) => { send("SessionStart", p); send("ViewContent", { content_name: p.session, content_category: "web_session", ...p }, { standard: true }); },
  oneMinute: (p) => send("Session1Min", p),
  firstHold: (p) => send("SessionHold", p),
  finish: (p) => send("SessionFinish", p),
  saveForLater: (p) => send("SaveForLater", p),   // p.option: app | calendar | ics | share | copy
  returnFromSaved: (p) => send("ReturnFromSaved", p),
  appTap: (p) => { send("AppTap", p); send("Lead", { content_name: p.session, ...p }, { standard: true }); },
};

export function initMeasurement() {
  memo = getConsent();
  if (memo === "granted") loadPixel();
}
