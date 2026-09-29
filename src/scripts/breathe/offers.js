// Completion offer (A/B) and the OneLink into the app. Spec: OFFER-CONFIG.md §2-3 (app repo, marketing).
// - Source: src/data/breathe-offers.json (built in). If OFFER_URL is set, the end screen reads the live offer at run
//   time; an error or no answer within 1.5 s means the standard copy and a link with no token.
// - Only an offer with status "live" is used. Then one arm is drawn by weight, once, and kept in localStorage as
//   {offerId, version, arm, assignmentId}, so a reload does not re-draw. With nothing live, nothing is stored.
// - Everything the app needs rides in deep_link_value (the only field it reads; it uppercases it):
//   WO.<OFFERID>.<ARM>.<assignmentId>, e.g. WO.WSOCT01.B.7KQ2M9XW3T. af_sub1..3 duplicate it for AppsFlyer reports.
import BUILT_IN from "../../data/breathe-offers.json";
import { oneLinkUrl } from "../contract.js";
import { OFFER_URL, OFFER_TIMEOUT_MS, ONELINK_BASE, ONELINK_CAMPAIGN, ONELINK_PID, ARM_KEY } from "./config.js";

export const STANDARD = BUILT_IN.standard;
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32: no I, L, O, U

function liveOffer(o, session) {
  if (!o || o.status !== "live" || typeof o.id !== "string" || !Array.isArray(o.arms)) return null;
  if (Array.isArray(o.sessions) && session && !o.sessions.includes(session)) return null;
  const arms = o.arms.filter((a) => a && typeof a.key === "string" && (+a.weight || 0) > 0 && typeof a.copy_en === "string");
  if (arms.filter((a) => a.control).length !== 1 || arms.length < 2) return null; // a test needs one control and a variant
  return { ...o, arms };
}

// The offer to use now, or null (standard copy, no token)
export async function loadOffer(session) {
  if (!OFFER_URL) return liveOffer(BUILT_IN.offer, session);
  try {
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => ctl && ctl.abort(), OFFER_TIMEOUT_MS);
    const url = OFFER_URL + (OFFER_URL.includes("?") ? "&" : "?") + "session=" + encodeURIComponent(session);
    const r = await Promise.race([
      fetch(url, { credentials: "omit", signal: ctl ? ctl.signal : undefined }),
      new Promise((_, no) => setTimeout(() => no(new Error("timeout")), OFFER_TIMEOUT_MS)),
    ]);
    clearTimeout(timer);
    if (!r.ok) return null;
    const j = await r.json();
    return liveOffer(j && j.offer !== undefined ? j.offer : j, session);
  } catch (_) {
    return null; // failure is always honest: today's 14 days
  }
}

const codeId = (id) => String(id).toUpperCase().replace(/[^A-Z0-9]/g, "");

function randomId(n = 10) {
  const out = []; const buf = new Uint8Array(n);
  try { crypto.getRandomValues(buf); } catch (_) { for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256); }
  for (let i = 0; i < n; i++) out.push(B32[buf[i] & 31]);
  return out.join("");
}

// The stored assignment, if it belongs to this offer (for the events before the end screen)
export function storedAssignment() {
  try { const a = JSON.parse(localStorage.getItem(ARM_KEY) || "null"); return a && a.offerId && a.arm && a.assignmentId ? a : null; } catch (_) { return null; }
}

// Draw once per offer; returns {offerId, version, arm, assignmentId, armDef} or null when nothing is live
export function assign(offer) {
  if (!offer) return null;
  const saved = storedAssignment();
  if (saved && saved.offerId === offer.id) {
    const armDef = offer.arms.find((a) => a.key === saved.arm);
    if (armDef) return { ...saved, armDef };
  }
  const total = offer.arms.reduce((s, a) => s + +a.weight, 0);
  const r = new Uint32Array(1);
  try { crypto.getRandomValues(r); } catch (_) { r[0] = Math.floor(Math.random() * 4294967296); }
  let u = (r[0] / 4294967296) * total, armDef = offer.arms[offer.arms.length - 1];
  for (const a of offer.arms) { u -= +a.weight; if (u < 0) { armDef = a; break; } }
  const a = { offerId: offer.id, version: offer.version || 1, arm: armDef.key, assignmentId: randomId() };
  try { localStorage.setItem(ARM_KEY, JSON.stringify(a)); } catch (_) { /* still valid for this page view */ }
  return { ...a, armDef };
}

export const tokenOf = (a) => (a ? `WO.${codeId(a.offerId)}.${a.arm.toUpperCase()}.${a.assignmentId}` : null);
export const shortCodeOf = (a) => (a ? `${codeId(a.offerId)}-${a.assignmentId}` : null);
export const pick = (o, key, lang) => (o && ((lang === "sv" && o[key + "_sv"]) || o[key + "_en"])) || "";

// The OneLink, through the shared parameter contract (src/scripts/contract.js): with an assignment (only while a test
// offer is live) the token in deep_link_value and af_sub1 = offer id, af_sub2 = arm. Always: af_sub3 = session,
// af_sub4 = 1 finished / 0 left early; plus the ad's utm_*, h, v and src (c, af_channel, af_adset, af_ad, af_sub5).
// `at` says where the tap was: end, exit, in_session, saved.
let linkCtx = { contract: {}, v: null };
export function setLinkContext(ctx) { linkCtx = { ...linkCtx, ...ctx }; }
export function oneLink({ session, completed, assignment, at }) {
  // CONFIG GAP (owner of main): an app deep link that opens the session directly (af_dp / a UDL sub key), once
  // the app reads one; today the app reads only deep_link_value, which stays reserved for the offer token.
  return oneLinkUrl(ONELINK_BASE, {
    pid: ONELINK_PID, campaign: ONELINK_CAMPAIGN, contract: linkCtx.contract, v: linkCtx.v,
    session, completed, assignment, token: tokenOf(assignment), at: at || (completed ? "end" : "exit"),
  });
}
