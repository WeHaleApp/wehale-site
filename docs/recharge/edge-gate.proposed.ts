// PROPOSED, NOT DEPLOYED (docs/recharge/README.md). A server-side gate for /recharge, if the owner of main prefers it
// to the key in the URL. To use: move this file to netlify/edge-functions/recharge-gate.ts, set RECHARGE_USER and
// RECHARGE_PASS in Netlify (Site settings → Environment variables, scoped to the deploy previews and production),
// and set gate.on to false in src/data/recharge.json (the edge function replaces the key check).
// Unlike the key check, the page's HTML never reaches a visitor without the password. Remove the file at launch.
import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, ctx: Context) => {
  const user = Netlify.env.get("RECHARGE_USER"), pass = Netlify.env.get("RECHARGE_PASS");
  if (!user || !pass) return new Response("Not found", { status: 404 });   // fail closed
  const auth = req.headers.get("authorization") || "";
  const [scheme, value] = auth.split(" ");
  if (scheme === "Basic" && value) {
    const [u, ...p] = atob(value).split(":");
    if (u === user && p.join(":") === pass) {
      const res = await ctx.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      res.headers.set("Cache-Control", "private, no-store");
      return res;
    }
  }
  return new Response("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="preview", charset="UTF-8"' } });
};

export const config: Config = { path: ["/recharge", "/recharge.html", "/recharge/*"] };
