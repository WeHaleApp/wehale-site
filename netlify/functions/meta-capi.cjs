// PROPOSAL, NEEDS THE OWNER OF MAIN'S APPROVAL. Not wired up: the page sends nothing here unless
// PUBLIC_META_CAPI_URL is set, and this function does nothing unless META_CAPI_TOKEN and META_PIXEL_ID are set.
//
// Netlify Function: /.netlify/functions/meta-capi
// Meta Conversions API relay for wehale.io/breathe (docs/breathe/MEASUREMENT.md).
// - Accepts only the page's own funnel events, only with consent: "granted" in the body. The page only calls it
//   after the visitor pressed Accept.
// - Uses the browser's event_id, so Meta de-duplicates the pixel and server copies.
// - Sends no PII: no email, phone, name or ids of ours. user_data carries only what Meta needs to match a web
//   event (client IP and user agent, as received, and the pixel's own _fbp/_fbc cookie values if present).
// - Rate limit: 60 events per IP per minute, per warm instance (best effort; Netlify instances are not shared).
//
// Env: META_CAPI_TOKEN (secret, Events Manager > Settings > Conversions API), META_PIXEL_ID,
//      optional META_TEST_EVENT_CODE (only while testing).

const GRAPH = "https://graph.facebook.com/v21.0";
const ALLOWED = new Set(["PageView", "ViewContent", "Lead", "SessionPicked", "SessionStart", "Session1Min", "SessionHold", "SessionFinish", "AppTap"]);
const PARAM_KEYS = ["session", "arm", "source", "assignment_id", "completed", "content_name", "content_category", "v", "h"];
const ORIGINS = new Set(["https://wehale.io", "https://www.wehale.io"]);
const WINDOW_MS = 60_000, MAX_PER_WINDOW = 60;
const hits = new Map();

function limited(ip) {
  const now = Date.now(), h = hits.get(ip);
  if (!h || now - h.t > WINDOW_MS) { hits.set(ip, { t: now, n: 1 }); if (hits.size > 5000) hits.clear(); return false; }
  h.n += 1; return h.n > MAX_PER_WINDOW;
}
const str = (v, n = 80) => (typeof v === "string" ? v.slice(0, n) : typeof v === "number" ? String(v) : undefined);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const token = process.env.META_CAPI_TOKEN, pixel = process.env.META_PIXEL_ID;
  if (!token || !pixel) return { statusCode: 204, body: "" };   // not configured: accept and drop

  const origin = event.headers.origin || "";
  const preview = /^https:\/\/[a-z0-9-]+--wehale-webs\.netlify\.app$/.test(origin);   // deploy previews, for the test plan
  if (!ORIGINS.has(origin) && !preview) return { statusCode: 403, body: "Forbidden" };

  const ip = (event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if (limited(ip || "unknown")) return { statusCode: 429, body: "Too Many Requests" };

  let b;
  try { b = JSON.parse(event.body || "{}"); } catch (_) { return { statusCode: 400, body: "Invalid JSON" }; }
  if (b.consent !== "granted") return { statusCode: 204, body: "" };            // never without consent
  if (!ALLOWED.has(b.event_name) || !/^[\w-]{8,64}$/.test(String(b.event_id || ""))) return { statusCode: 400, body: "Bad event" };

  const custom = {};
  for (const k of PARAM_KEYS) { const v = str(b.custom_data && b.custom_data[k]); if (v !== undefined) custom[k] = v; }
  let url = "https://wehale.io/breathe";
  try { const u = new URL(String(b.event_source_url || "")); if (ORIGINS.has(u.origin) || preview) url = u.origin + u.pathname; } catch (_) {}

  const user_data = { client_ip_address: ip || undefined, client_user_agent: str(event.headers["user-agent"], 400) };
  if (/^fb\.\d\.\d+\.\d+$/.test(String(b.fbp || ""))) user_data.fbp = b.fbp;
  if (/^fb\.\d\.\d+\.[\w-]+$/.test(String(b.fbc || ""))) user_data.fbc = b.fbc;

  const payload = {
    data: [{ event_name: b.event_name, event_time: Math.floor(Date.now() / 1000), event_id: b.event_id, action_source: "website", event_source_url: url, user_data, custom_data: custom }],
  };
  const test = process.env.META_TEST_EVENT_CODE || str(b.test_event_code, 40);
  if (test) payload.test_event_code = test;

  try {
    const r = await fetch(`${GRAPH}/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    return { statusCode: r.ok ? 204 : 502, body: "" };
  } catch (_) {
    return { statusCode: 502, body: "" };
  }
};
