// The ad-to-site parameter contract (SITE-GOALS §4, app repo docs/marketing/2026-q4-paid/SITE-GOALS.md).
// One module, no DOM, so it is unit-tested (tests/contract.test.mjs) and shared by every page and /breathe.
//
//   ?h=<hook>        the ad's hook: the headline comes from src/data/hooks.json
//   ?s=<session>     preselects the /breathe session (wake-up, unravel, soft-reboot)
//   ?v=<variant>     the page variant (A/B): home hero, /breathe start screen
//   ?src=<source>    where the link came from: adpreview, saved, …
//   utm_source, utm_medium, utm_campaign, utm_content (one per ad)
//
// Every event carries all of them (eventParams), every internal link passes them on (carryHref), and every app link
// carries them into the OneLink (oneLinkUrl), so an app sign-up traces back to the ad and the page variant.
// No personal data: values are clipped and reduced to a safe character set, and nothing is stored.

export const CONTRACT_KEYS = ["h", "s", "v", "src", "utm_source", "utm_medium", "utm_campaign", "utm_content"];
const MAX = 100;

export function clean(value, max = MAX) {
  if (value == null) return null;
  const s = String(value).trim().slice(0, max).replace(/[^\w.\-~:+|/ ]/g, "").trim();
  return s || null;
}

/** Reads the contract from a query string (and the referrer, for `source`). */
export function readContract(search, referrer) {
  const q = new URLSearchParams(search || "");
  const c = {};
  for (const k of CONTRACT_KEYS) { const v = clean(q.get(k)); if (v) c[k] = v; }
  // source: the one field every event already had on /breathe (docs/breathe/MEASUREMENT.md)
  let ref = null;
  try { if (referrer) ref = new URL(referrer).hostname.slice(0, 60); } catch (_) { /* not a URL */ }
  c.source = c.utm_source ? c.utm_source.slice(0, 40) : q.get("fbclid") ? "meta" : q.get("ttclid") ? "tiktok" : ref || "direct";
  return c;
}

/**
 * The params every event carries: source, v (the variant actually shown), and each contract key that is present.
 * `extra` (session, arm, page, …) wins over the contract, so an event's own fields keep their meaning.
 */
export function eventParams(contract, extra = {}) {
  const p = { source: contract.source || "direct" };
  for (const k of CONTRACT_KEYS) if (contract[k]) p[k] = contract[k];
  return { ...p, ...extra };
}

/** The contract as query pairs, for passing on to another page of the site (e.g. home → /breathe). */
export function contractQuery(contract) {
  const q = new URLSearchParams();
  for (const k of CONTRACT_KEYS) if (contract[k]) q.set(k, contract[k]);
  return q;
}

/** An internal href with the contract added (keys already on the href win). External and hash links are unchanged. */
export function carryHref(href, contract, origin = "https://wehale.io") {
  if (!href || href.startsWith("#") || /^(mailto|tel):/i.test(href)) return href;
  let u;
  try { u = new URL(href, origin); } catch (_) { return href; }
  if (u.origin !== origin) return href;
  for (const [k, v] of contractQuery(contract)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
  const rel = u.pathname + (u.search || "") + (u.hash || "");
  return /^https?:/i.test(href) ? u.toString() : rel;
}

/**
 * The OneLink with the contract passed through. The mapping (documented in docs/breathe/MEASUREMENT.md):
 *   pid          fixed per surface: web_session (/breathe) or website (the rest of the site)
 *   c            utm_campaign, else the surface's default (breathe, site)
 *   af_channel   source (utm_source, else meta/tiktok from the click id, else the referrer)
 *   af_adset     h (the hook: one per person and concept)
 *   af_ad        utm_content (one per ad)
 *   af_sub1/2    the offer id and arm, only while a test offer is live (unchanged)
 *   af_sub3      the session (unchanged); af_sub4 1 finished / 0 left early (unchanged, /breathe only)
 *   af_sub5      where the tap happened plus the rest of the contract: "at=end;v=g1;src=adpreview;med=paid_social;s=unravel"
 *   deep_link_value  reserved for the offer token (unchanged)
 */
export function oneLinkUrl(base, { pid, campaign, contract = {}, session, completed, assignment, token, at, v } = {}) {
  if (!base) return null;
  const q = new URLSearchParams();
  q.set("pid", pid);
  q.set("c", contract.utm_campaign || campaign);
  if (contract.source) q.set("af_channel", contract.source);
  if (contract.h) q.set("af_adset", contract.h);
  if (contract.utm_content) q.set("af_ad", contract.utm_content);
  if (assignment && completed && token) {
    q.set("deep_link_value", token);
    q.set("af_sub1", assignment.offerId);
    q.set("af_sub2", assignment.arm);
  }
  if (session) q.set("af_sub3", session);
  if (completed !== undefined && completed !== null) q.set("af_sub4", completed ? "1" : "0");
  const sub5 = [];
  if (at) sub5.push("at=" + at);
  const variant = v || contract.v;
  if (variant) sub5.push("v=" + variant);
  if (contract.src) sub5.push("src=" + contract.src);
  if (contract.utm_medium) sub5.push("med=" + contract.utm_medium);
  if (contract.s && contract.s !== session) sub5.push("s=" + contract.s);
  if (sub5.length) q.set("af_sub5", sub5.join(";"));
  return base + "?" + q.toString();
}
