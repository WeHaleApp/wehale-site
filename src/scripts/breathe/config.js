// /breathe configuration: every value that still needs a person is here, marked CONFIG GAP.
// Nothing here is secret. Nothing fires while a gap is open.

// CONFIG GAP (lead to confirm with Isak): the OneLink template. wehale.onelink.me, template ID "zcid",
// iOS + Android. No link has been created in AppsFlyer for this; the template's own fallback decides where a
// visitor without the app lands (App Store / Google Play). Set to null to hide the app button entirely.
export const ONELINK_BASE = "https://wehale.onelink.me/zcid";

// OneLink parameters (docs/marketing/2026-q4-paid/web-session/OFFER-CONFIG.md, app repo): media source and campaign.
export const ONELINK_PID = "web_session";
export const ONELINK_CAMPAIGN = "breathe";

// CONFIG GAP (Isak): the Meta Pixel (dataset) ID, set as the Netlify env var PUBLIC_META_PIXEL_ID. Unset now,
// so fbevents.js is never requested, even after consent.
export const META_PIXEL_ID = (import.meta.env.PUBLIC_META_PIXEL_ID || "").trim();

// CONFIG GAP (owner of main + Isak): the Conversions API endpoint. Only once
// netlify/functions/meta-capi.cjs is approved and META_CAPI_TOKEN is set in Netlify. Null = no server events.
export const META_CAPI_URL = (import.meta.env.PUBLIC_META_CAPI_URL || "").trim() || null;

// CONFIG GAP (Isak): a Meta Events Manager test code, only while testing (see docs/breathe/MEASUREMENT.md).
// It can also be passed as ?fbtest=TEST12345 on the page.
export const META_TEST_EVENT_CODE = (import.meta.env.PUBLIC_META_TEST_EVENT_CODE || "").trim() || null;

// The completion offer. The source today is src/data/breathe-offers.json, built into the page. The offer spec
// proposes a public read, GET /public/web-offer?session=<slug>, not built yet and needing the owner of main's OK.
// CONFIG GAP (owner of main): set PUBLIC_BREATHE_OFFER_URL to that endpoint (or to a static JSON of the same
// shape) and the end screen reads it at run time. Any error, or no answer within OFFER_TIMEOUT_MS, shows control.
export const OFFER_URL = (import.meta.env.PUBLIC_BREATHE_OFFER_URL || "").trim() || null;
export const OFFER_TIMEOUT_MS = 1500;

// Storage keys, both localStorage, no cookies. The offer assignment is written only while a test offer is live.
export const CONSENT_KEY = "wehale.consent.v1";
export const ARM_KEY = "wehale.breathe.offer.v1";

// Time-of-day preselect (visitor's local clock): before 11:00 wake-up, 11:00 to 18:00 unravel, after wind-down.
export const MORNING_ENDS = 11;
export const DAYTIME_ENDS = 18;
