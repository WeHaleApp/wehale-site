// Password-gated host for the Plasma Touch prototype (internal review; Salte credit inside).
// Serves /proto/ after a password page. Set PROTO_PASSWORD in the Netlify environment.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DIR = [path.join(__dirname, "..", "proto-files"), path.join(process.env.LAMBDA_TASK_ROOT || "", "netlify", "proto-files")].find((d) => fs.existsSync(d)) || path.join(__dirname, "..", "proto-files");
const TYPES = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".mp3": "audio/mpeg", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const HEAD = `<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black"><meta name="apple-mobile-web-app-title" content="Plasma"><meta name="theme-color" content="#14090f"><meta name="robots" content="noindex,nofollow"><link rel="manifest" href="/proto/manifest.webmanifest"><link rel="apple-touch-icon" href="/proto/icon.png">`;
const baseHeaders = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };

const token = (pw) => crypto.createHmac("sha256", pw).update("plasma-proto-v1").digest("hex");
const cookieOk = (h, pw) => (h.cookie || "").split(/;\s*/).some((c) => c === "proto=" + token(pw));

const page = (msg) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><title>Plasma</title>${HEAD}
<style>html,body{height:100%;margin:0;background:#14090f;color:#f3e6df;font-family:-apple-system,system-ui,sans-serif}form{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;box-sizing:border-box}input,button{font:inherit;font-size:17px;border-radius:999px;border:0;padding:14px 22px;width:100%;max-width:300px;box-sizing:border-box;text-align:center}input{background:#2a1520;color:#f3e6df}button{background:#f6ede4;color:#14090f;font-weight:700}p{margin:0;opacity:.7;font-size:14px;min-height:18px}</style></head>
<body><form method="post" action="/proto/"><p>${msg || "Internal prototype"}</p><input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password"><button>Open</button></form></body></html>`;

exports.handler = async (event) => {
  const pw = process.env.PROTO_PASSWORD;
  if (!pw) return { statusCode: 503, headers: baseHeaders, body: "Not configured" };
  const sub = (event.path || "").replace(/^\/(\.netlify\/functions\/proto|proto)\/?/, "") || "index.html";

  if (event.httpMethod === "POST") {
    const given = new URLSearchParams(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body || "").get("password") || "";
    const a = Buffer.from(token(given)), b = Buffer.from(token(pw));
    if (crypto.timingSafeEqual(a, b)) {
      return { statusCode: 303, headers: { ...baseHeaders, Location: "/proto/", "Set-Cookie": `proto=${token(pw)}; Path=/proto; Max-Age=15552000; HttpOnly; Secure; SameSite=Lax` }, body: "" };
    }
    return { statusCode: 401, headers: { ...baseHeaders, "Content-Type": TYPES[".html"] }, body: page("Wrong password") };
  }

  if (!cookieOk(event.headers || {}, pw)) return { statusCode: 401, headers: { ...baseHeaders, "Content-Type": TYPES[".html"] }, body: page("") };

  const file = path.normalize(path.join(DIR, sub));
  if (!file.startsWith(DIR) || !fs.existsSync(file)) return { statusCode: 404, headers: baseHeaders, body: "Not found" };
  const ext = path.extname(file);
  const type = TYPES[ext] || "application/octet-stream";
  if (ext === ".html") {
    let html = fs.readFileSync(file, "utf8");
    html = html.replace(/<meta name="viewport"[^>]*>/i, "").replace(/<head>/i, `<head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${HEAD}`);
    return { statusCode: 200, headers: { ...baseHeaders, "Content-Type": type }, body: html };
  }
  const bin = ext === ".png" || ext === ".mp3";
  return { statusCode: 200, headers: { ...baseHeaders, "Content-Type": type }, body: fs.readFileSync(file).toString(bin ? "base64" : "utf8"), isBase64Encoded: bin };
};
