// Off until configured: the pages send nothing here unless PUBLIC_TIKTOK_PIXEL_ID is set, TIKTOK_EVENTS_TOKEN and
// TIKTOK_PIXEL_ID were present at build time, and the visitor accepted ad measurement; and this function does nothing
// unless TIKTOK_EVENTS_TOKEN and TIKTOK_PIXEL_ID are set (docs/ENV.md).
//
// Netlify Function: /.netlify/functions/tiktok-events
// TikTok Events API relay (the server copy of the TikTok Pixel) for wehale.io and /breathe.
// - Only the site's own events, only with consent: "granted" in the body (the page calls it only after Accept).
// - Uses the browser's event_id, so TikTok de-duplicates the pixel and server copies.
// - No PII: user carries only what TikTok needs to match a web event (IP and user agent as received, the pixel's own
//   _ttp cookie and the ad's ttclid if present).
// - Rate limit: 60 events per IP per minute, per warm instance (best effort).
//
// Env: TIKTOK_EVENTS_TOKEN (secret, TikTok Events Manager > the pixel > Settings > Events API > Generate access token),
//      TIKTOK_PIXEL_ID (the pixel code), optional TIKTOK_TEST_EVENT_CODE (only while testing).

const API = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const ALLOWED = new Set(["Pageview", "ViewContent", "ClickButton", "SessionPicked", "SessionStart", "Session1Min", "SessionHold", "SessionFinish",
  "SaveForLater", "ReturnFromSaved", "TrySessionTap", "SessionCardPlay", "GuideVoicePlay"]);
const PARAM_KEYS = ["session", "arm", "source", "assignment_id", "completed", "content_name", "content_category", "option", "page", "at", "store",
  "v", "h", "s", "src", "utm_source", "utm_medium", "utm_campaign", "utm_content"];
const ORIGINS = new Set(["https://wehale.io", "https://www.wehale.io"]);
const WINDOW_MS = 60_000, MAX_PER_WINDOW = 60;
const hits = new Map();

function limited(ip) {
  const now = Date.now(), h = hits.get(ip);
  if (!h || now - h.t > WINDOW_MS) { hits.set(ip, { t: now, n: 1 }); if (hits.size > 5000) hits.clear(); return false; }
  h.n += 1; return h.n > MAX_PER_WINDOW;
}
const str = (v, n = 100) => (typeof v === "string" ? v.slice(0, n) : typeof v === "number" ? String(v) : undefined);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const token = process.env.TIKTOK_EVENTS_TOKEN, pixel = process.env.TIKTOK_PIXEL_ID;
  if (!token || !pixel) return { statusCode: 204, body: "" };   // not configured: accept and drop

  const origin = event.headers.origin || "";
  const preview = /^https:\/\/[a-z0-9-]+--wehale-webs\.netlify\.app$/.test(origin);
  if (!ORIGINS.has(origin) && !preview) return { statusCode: 403, body: "Forbidden" };

  const ip = (event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if (limited(ip || "unknown")) return { statusCode: 429, body: "Too Many Requests" };

  let b;
  try { b = JSON.parse(event.body || "{}"); } catch (_) { return { statusCode: 400, body: "Invalid JSON" }; }
  if (b.consent !== "granted") return { statusCode: 204, body: "" };            // never without consent
  if (!ALLOWED.has(b.event) || !/^[\w-]{8,64}$/.test(String(b.event_id || ""))) return { statusCode: 400, body: "Bad event" };

  const properties = {};
  for (const k of PARAM_KEYS) { const v = str(b.properties && b.properties[k]); if (v !== undefined) properties[k] = v; }
  let url = "https://wehale.io/";
  try { const u = new URL(String(b.url || "")); if (ORIGINS.has(u.origin) || preview) url = u.origin + u.pathname; } catch (_) {}

  const user = { ip: ip || undefined, user_agent: str(event.headers["user-agent"], 400) };
  if (/^[\w.-]{8,80}$/.test(String(b.ttp || ""))) user.ttp = b.ttp;
  const ad = /^[\w.-]{8,200}$/.test(String(b.ttclid || "")) ? { callback: b.ttclid } : undefined;

  const payload = {
    event_source: "web", event_source_id: pixel,
    data: [{ event: b.event, event_time: Math.floor(Date.now() / 1000), event_id: b.event_id, user, page: { url }, ad, properties }],
  };
  const test = process.env.TIKTOK_TEST_EVENT_CODE || str(b.test_event_code, 40);
  if (test) payload.test_event_code = test;

  try {
    const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json", "Access-Token": token }, body: JSON.stringify(payload) });
    return { statusCode: r.ok ? 204 : 502, body: "" };
  } catch (_) {
    return { statusCode: 502, body: "" };
  }
};
