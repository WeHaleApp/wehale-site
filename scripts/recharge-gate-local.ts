// Runs the real edge function (netlify/edge-functions/recharge-gate.ts) in Deno in front of the built site, to test the gate locally:
//   npm run build && RECHARGE_PASS='some test password' deno run -A scripts/recharge-gate-local.ts [port]   (port 8899)
// Same runtime as Netlify's edge (Deno). It only serves dist/ and applies the function to the paths in its `config`; it changes nothing on Netlify.
import gate, { config } from "../netlify/edge-functions/recharge-gate.ts";

const port = Number(Deno.args[0] || 8899), root = new URL("../dist/", import.meta.url);
(globalThis as any).Netlify = { env: { get: (k: string) => Deno.env.get(k) } };
const types: Record<string, string> = { html: "text/html; charset=utf-8", webp: "image/webp", svg: "image/svg+xml", js: "text/javascript", css: "text/css", jpg: "image/jpeg", png: "image/png", mp4: "video/mp4", json: "application/json" };
const match = (p: string) => config.path!.some((c) => (c.endsWith("/*") ? p.startsWith(c.slice(0, -1)) : p === c));

async function file(path: string) {
  for (const f of [path, path + ".html", path + "/index.html"]) {
    try { const b = await Deno.readFile(new URL("." + f, root)); return new Response(b, { headers: { "Content-Type": types[f.split(".").pop()!] || "application/octet-stream" } }); } catch (_) { /* next */ }
  }
  return new Response("Not found", { status: 404 });
}
Deno.serve({ port }, (req) => {
  const p = new URL(req.url).pathname;
  return match(p) ? (gate as any)(req, { next: () => file(p) }) : file(p);
});
