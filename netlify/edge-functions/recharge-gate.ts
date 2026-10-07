// The campaign page's password gate (docs/recharge/README.md, "The gate"). A Netlify Edge Function: the page's HTML and media
// never leave the server without the shared password. One password for the team and for outside people.
//
//  - Env (Netlify → Site configuration → Environment variables): RECHARGE_PASS, the shared password. Never in the repo.
//    If it is not set, the page answers 404 (fail closed).
//  - The one flag is `gate.on` in src/data/recharge.json: true = the password is asked; false = the page is open (launch).
//  - A visitor sees a one-field password form; a right password sets a signed cookie (HttpOnly, Secure, 7 days) and returns to the same address, query string included, so a QR code or a link with ?ch=&c= keeps working.
//    A form and a cookie, not the browser's basic-auth box: it works in Instagram's, TikTok's and mail apps' in-app browsers and
//    on a phone's keyboard. `Authorization: Basic` (any user name, the password) is also accepted, for curl and scripts.
//  - The OneLink and the store are other hosts: the gate never sits between the button and the app.
import type { Config, Context } from "@netlify/edge-functions";
import DATA from "../../src/data/recharge.json" with { type: "json" };

const COOKIE = "wehale_rc";
const DAYS = 7;
const enc = new TextEncoder();
const NOINDEX = { "X-Robots-Tag": "noindex, nofollow, noarchive", "Cache-Control": "private, no-store", "Referrer-Policy": "same-origin" };

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function hmac(key: string, data: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}
/** Constant-time for equal-length strings: the two values are first turned into HMACs, so their length never leaks. */
async function same(a: string, b: string) {
  const [x, y] = await Promise.all([hmac("cmp", a), hmac("cmp", b)]);
  let d = 0; for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}
export const token = async (pass: string, exp: number) => `${exp}.${await hmac(pass, "rc:" + exp)}`;
async function tokenOk(pass: string, value: string, now: number) {
  const [exp] = value.split(".");
  return /^\d{10}$/.test(exp) && Number(exp) > now && (await same(value, await token(pass, Number(exp))));
}
const cookieOf = (req: Request) => (req.headers.get("cookie") || "").split(/;\s*/).map((c) => c.split("=")).find(([n]) => n === COOKIE)?.[1] || "";

function page(status: number, wrong: boolean) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><meta name="color-scheme" content="dark"><title>WeHale</title>
<style>html,body{margin:0;height:100%;background:#0e0907;color:#f5ecdf;font:500 17px/1.4 "Nunito Sans",system-ui,-apple-system,"Segoe UI",sans-serif}
form{min-height:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:14px;max-width:340px;margin:0 auto;padding:24px}
p{margin:0;opacity:.8}.e{color:#ffb4a8;opacity:1}input,button{font:inherit;border-radius:999px;border:0;padding:15px 20px;box-sizing:border-box;width:100%}
input{background:#1d1512;color:#f5ecdf;outline:1px solid #4a3d36}input:focus{outline:2px solid #c9b8ff}button{background:#c9b8ff;color:#1a1033;font-weight:700}</style></head>
<body><form method="post" autocomplete="off"><p>This page is private for now. Enter the password you were given.</p>${wrong ? '<p class="e" role="alert">That is not the password.</p>' : ""}
<input type="password" name="password" aria-label="Password" autocomplete="current-password" autofocus required><button type="submit">Continue</button></form></body></html>`;
  return new Response(html, { status, headers: { ...NOINDEX, "Content-Type": "text/html; charset=utf-8" } });
}

/** The whole decision, apart from Netlify's globals so it can be tested (tests/recharge-gate.test.ts). */
export async function gate(req: Request, pass: string | undefined, next: () => Promise<Response>, now = Math.floor(Date.now() / 1000), on: boolean = DATA.gate.on): Promise<Response> {
  if (!on) return next();                                   // launched: the page is open
  if (!pass) return new Response("Not found", { status: 404, headers: NOINDEX });   // no password set: closed
  const auth = req.headers.get("authorization") || "";
  const basic = /^Basic (.+)$/.exec(auth);
  let given = "";
  if (basic) { try { given = atob(basic[1]).split(":").slice(1).join(":"); } catch (_) { /* not base64 */ } }
  if (given && (await same(given, pass))) return protect(await next());
  if (await tokenOk(pass, cookieOf(req), now)) return protect(await next());
  if (req.method === "POST") {
    let typed = "";
    try { typed = String((await req.formData()).get("password") || ""); } catch (_) { /* not a form */ }
    if (typed && (await same(typed, pass))) {
      const exp = now + DAYS * 86400, u = new URL(req.url);
      return new Response(null, { status: 303, headers: { ...NOINDEX, Location: u.pathname + u.search, "Set-Cookie": `${COOKIE}=${await token(pass, exp)}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax` } });
    }
    await new Promise((r) => setTimeout(r, 400));          // a small brake on guessing
    return page(401, true);
  }
  return page(401, false);
}
function protect(res: Response) { const r = new Response(res.body, res); for (const [k, v] of Object.entries(NOINDEX)) r.headers.set(k, v); return r; }

export default async (req: Request, ctx: Context) => gate(req, (globalThis as any).Netlify?.env.get("RECHARGE_PASS"), () => ctx.next());

// Netlify needs the path as a literal; tests/recharge-gate.test.ts checks it matches `route` in src/data/recharge.json.
export const config: Config = { path: ["/recharge", "/recharge.html", "/recharge/*"] };
