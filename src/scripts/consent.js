// Consent for the whole site, /breathe included (SITE-GOALS §5). Two choices: measurement (Google Analytics through
// GTM) and ads (the Meta and TikTok pixels and their server copies). No answer means neither.
// Stored in localStorage (not a cookie) under the key /breathe already used, so a choice made there carries over.
// Google Consent Mode v2: the layouts' <head> sets every type to "denied" before anything else runs (consentHead
// below, inlined), and applies a stored choice at once; save() sends the update.

export const CONSENT_KEY = "wehale.consent.v1";

/** {analytics, ads} from storage, or null (no answer yet). Reads the /breathe format ({choice}) as well. */
export function readStored(storage) {
  try {
    const o = JSON.parse((storage || localStorage).getItem(CONSENT_KEY) || "null");
    if (!o) return null;
    if (typeof o.analytics === "boolean" && typeof o.ads === "boolean") return { analytics: o.analytics, ads: o.ads };
    if (o.choice === "granted") return { analytics: true, ads: true };
    if (o.choice === "denied") return { analytics: false, ads: false };
    return null;
  } catch (_) {
    return null; // storage blocked (private mode, some in-app browsers): no answer, the banner asks again
  }
}

/** Consent Mode v2 fields for a choice. */
export function consentModeFor(state) {
  const a = state && state.analytics ? "granted" : "denied";
  const ad = state && state.ads ? "granted" : "denied";
  return { analytics_storage: a, ad_storage: ad, ad_user_data: ad, ad_personalization: ad };
}

let memo;
const listeners = new Set();
export function current() {
  if (memo === undefined) memo = readStored();
  return memo;
}
export function onChange(f) { listeners.add(f); return () => listeners.delete(f); }

export function save(state) {
  const s = { analytics: !!state.analytics, ads: !!state.ads };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...s, choice: s.analytics && s.ads ? "granted" : !s.analytics && !s.ads ? "denied" : "custom", at: new Date().toISOString(), v: 2 }));
  } catch (_) { /* the choice still applies for this page view */ }
  memo = s;
  try { window.gtag && window.gtag("consent", "update", consentModeFor(s)); } catch (_) {}
  listeners.forEach((f) => { try { f(s); } catch (_) {} });
  return s;
}

/**
 * The inline <head> script (as a string, so the layouts can inline it before any tag): the Consent Mode default,
 * everything denied, then a stored choice applied at once so GTM, if it loads, starts in the right state.
 */
export const consentHead = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:"denied",functionality_storage:"denied",personalization_storage:"denied",security_storage:"denied",wait_for_update:500});
gtag("set","ads_data_redaction",true);gtag("set","url_passthrough",false);
try{var c=JSON.parse(localStorage.getItem("${CONSENT_KEY}")||"null");if(c){var a=typeof c.analytics==="boolean"?c.analytics:c.choice==="granted",d=typeof c.ads==="boolean"?c.ads:c.choice==="granted";
if(a||d)gtag("consent","update",{analytics_storage:a?"granted":"denied",ad_storage:d?"granted":"denied",ad_user_data:d?"granted":"denied",ad_personalization:d?"granted":"denied"});}}catch(e){}`;
