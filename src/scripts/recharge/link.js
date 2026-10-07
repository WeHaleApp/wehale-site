// The campaign page's link into the app (docs/recharge/README.md). No DOM, so it is unit-tested (tests/recharge.test.js)
// and shared by the page and the QR script (scripts/recharge-qr.mjs).
//
//   ?ch=newsletter|pdp|influencer|social  the channel tag, into af_sub1 (anything else: "web")
//   ?c=<CODE>                              the code, into deep_link_value (else the channel's code, else the default)
//   utm_*, h, v, src                       the site's parameter contract (src/scripts/contract.js), passed on as on /breathe
//
// The OneLink:
//   pid              the campaign's media source (src/data/recharge.json)
//   c                recharge (fixed: a utm_campaign never replaces it; it rides in af_sub5 as camp=)
//   deep_link_value  the code; the app applies it at sign-up, including Apple and Google sign-in
//   af_sub1          the channel tag
//   af_channel       utm_source (as on /breathe), af_ad utm_content, af_adset h
//   af_sub5          "at=<where>;med=<utm_medium>;camp=<utm_campaign>;v=…;src=…"
import { readContract, clean } from "../contract.js";

const CODE_MAX = 32;

/** A code as the app reads it: upper case, letters, digits, - and _ only. Anything empty falls back. */
export function cleanCode(value, fallback) {
  const s = String(value == null ? "" : value).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, CODE_MAX);
  return s || fallback;
}

/** Reads the channel, the code and the contract from a query string. */
export function readCampaign(search, referrer, data) {
  const q = new URLSearchParams(search || "");
  const ch = q.get("ch") && data.channels.includes(q.get("ch").toLowerCase()) ? q.get("ch").toLowerCase() : "web";
  const byCh = (data.code.by_channel || {})[ch];
  const code = cleanCode(q.get("c"), cleanCode(byCh, data.code.default));
  return { ch, code, contract: readContract(search, referrer) };
}

/** The OneLink for this visit. `at` says where the link is used: offer, skip, qr, print. */
export function campaignLink(data, { ch, code, contract = {}, at } = {}) {
  const o = data.onelink;
  if (!o || !o.base) return null;
  const q = new URLSearchParams();
  q.set("pid", o.pid);
  q.set("c", o.c);
  q.set("deep_link_value", cleanCode(code, data.code.default));
  q.set("af_sub1", ch || "web");
  if (contract.utm_source) q.set("af_channel", contract.utm_source);
  if (contract.h) q.set("af_adset", contract.h);
  if (contract.utm_content) q.set("af_ad", contract.utm_content);
  const sub5 = [];
  if (at) sub5.push("at=" + clean(at, 20));
  if (contract.utm_medium) sub5.push("med=" + contract.utm_medium);
  if (contract.utm_campaign) sub5.push("camp=" + contract.utm_campaign);
  if (contract.v) sub5.push("v=" + contract.v);
  if (contract.src) sub5.push("src=" + contract.src);
  if (sub5.length) q.set("af_sub5", sub5.join(";"));
  return o.base + "?" + q.toString();
}

/** The phone the visitor is on, for the button's store line: ios, android or null (desktop, or unknown). */
export function phoneOf(ua, maxTouchPoints = 0) {
  const s = String(ua || "");
  if (/android/i.test(s)) return "android";
  if (/iphone|ipad|ipod/i.test(s)) return "ios";
  if (/Macintosh/.test(s) && maxTouchPoints > 1) return "ios";   // iPadOS reports itself as a Mac
  return null;
}

/**
 * The tester's quick way in (the app's `wehale:///quick-start`, wehale-app src/lib/quick-start.ts): the TEAM TEST CODE rides in the
 * address's #fragment (`/recharge?k=...#test=<CODE>`), which the browser never sends to a server and which is not in this public repo.
 * Without it the page is the ordinary campaign page. Only a plain code (letters and digits, 3 to 40) is accepted.
 */
export function testCodeFrom(hash) {
  const m = /^#?(?:.*&)?test=([A-Za-z0-9]{3,40})(?:&.*)?$/.exec(String(hash || ""));
  return m ? m[1].toUpperCase() : null;
}

/** The link a TestFlight / development build opens; a store build ignores it. */
export function quickStartLink(code) {
  const c = testCodeFrom("#test=" + String(code || ""));
  return c ? "wehale:///quick-start?code=" + c : null;
}
