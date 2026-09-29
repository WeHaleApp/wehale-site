// Measurement for /breathe: the funnel events, sent through the site's shared tags (src/scripts/tags.js), which load
// only after consent (src/scripts/consent.js) and only for the IDs that are set (docs/ENV.md).
// - Nothing non-essential loads before "Accept". Decline, or no answer, means no tag and no server events.
// - Every event gets one event_id, shared by the pixel and its server copy, so Meta and TikTok de-duplicate them.
// - Every event carries the ad-to-site contract (h, s, v, src, utm_*; src/scripts/contract.js) with its own fields.
// - No personal data is sent: no email, phone or name; the server copies add IP and user agent only as the platforms require.
// See docs/breathe/MEASUREMENT.md for the event table and the test plan.
import { send, startTags } from "../tags.js";
import { current, onChange } from "../consent.js";

export { eventId } from "../tags.js";
/** "granted" when ads measurement is allowed, "denied" after a no, null before any answer. */
export const consent = () => { const c = current(); return c ? (c.ads ? "granted" : "denied") : null; };
export const onConsent = (f) => onChange((s) => f(s.ads ? "granted" : "denied"));

// ---- the funnel ----
// Custom events carry {session, arm, source, v, …contract}; ViewContent (on start) and Lead (on the app tap) are the
// standard events Meta can optimise for.
export const track = {
  picked: (p) => send("SessionPicked", p),
  start: (p) => { send("SessionStart", p); send("ViewContent", { content_name: p.session, content_category: "web_session", ...p }); },
  oneMinute: (p) => send("Session1Min", p),
  firstHold: (p) => send("SessionHold", p),
  finish: (p) => send("SessionFinish", p),
  saveForLater: (p) => send("SaveForLater", p),   // p.option: app | calendar | ics | share | copy
  returnFromSaved: (p) => send("ReturnFromSaved", p),
  appTap: (p) => { send("AppTap", p); send("Lead", { content_name: p.session, ...p }); },
};

export function initMeasurement() { startTags(); }
