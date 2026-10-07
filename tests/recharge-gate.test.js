// The campaign page's server-side password gate (netlify/edge-functions/recharge-gate.ts). Run: npm test
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import DATA from "../src/data/recharge.json";
import { gate, config } from "../netlify/edge-functions/recharge-gate.ts";

const PASS = "correct horse", NOW = 1_800_000_000;
const page = () => Promise.resolve(new Response("<h1>the campaign page</h1>", { headers: { "Content-Type": "text/html" } }));
const get = (url = "https://wehale.io/recharge?ch=pdp&c=X1", headers = {}) => new Request(url, { headers });
const post = (password, url = "https://wehale.io/recharge?ch=pdp&c=X1") => new Request(url, { method: "POST", body: new URLSearchParams({ password }) });
const cookieFrom = (res) => /wehale_rc=([^;]+)/.exec(res.headers.get("set-cookie"))[1];

describe("the gate", () => {
  it("shows the password form, never the page, without the password", async () => {
    const res = await gate(get(), PASS, page, NOW, true);
    expect(res.status).toBe(401);
    const t = await res.text();
    expect(t).toContain('type="password"');
    expect(t).not.toContain("the campaign page");
    expect(res.headers.get("x-robots-tag")).toMatch(/noindex/);
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
  });
  it("a wrong password gets the form again, and no cookie", async () => {
    const res = await gate(post("nope"), PASS, page, NOW, true);
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBe(null);
    expect(await res.text()).toContain("not the password");
  });
  it("the right password returns to the same address, query string kept, with a signed cookie", async () => {
    const res = await gate(post(PASS), PASS, page, NOW, true);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/recharge?ch=pdp&c=X1");
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly; Secure; SameSite=Lax/);
    const ok = await gate(get("https://wehale.io/recharge?ch=pdp&c=X1", { cookie: "a=b; wehale_rc=" + cookieFrom(res) }), PASS, page, NOW + 60, true);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toContain("the campaign page");
    expect(ok.headers.get("x-robots-tag")).toMatch(/noindex/);
  });
  it("the cookie expires, and a changed password or a forged cookie is refused", async () => {
    const c = cookieFrom(await gate(post(PASS), PASS, page, NOW, true));
    const withC = (v) => get(undefined, { cookie: "wehale_rc=" + v });
    expect((await gate(withC(c), PASS, page, NOW + 8 * 86400, true)).status).toBe(401);
    expect((await gate(withC(c), "another password", page, NOW + 60, true)).status).toBe(401);
    expect((await gate(withC(c.replace(/.$/, (x) => (x === "a" ? "b" : "a"))), PASS, page, NOW + 60, true)).status).toBe(401);
    expect((await gate(withC("9999999999.deadbeef"), PASS, page, NOW, true)).status).toBe(401);
  });
  it("accepts basic auth with any user name (curl, scripts)", async () => {
    const h = (u, p) => ({ authorization: "Basic " + btoa(u + ":" + p) });
    expect((await gate(get(undefined, h("anyone", PASS)), PASS, page, NOW, true)).status).toBe(200);
    expect((await gate(get(undefined, h("anyone", "bad")), PASS, page, NOW, true)).status).toBe(401);
    expect((await gate(get(undefined, { authorization: "Basic ???" }), PASS, page, NOW, true)).status).toBe(401);
  });
  it("fails closed: no password set means 404, not an open page", async () => {
    expect((await gate(get(), undefined, page, NOW, true)).status).toBe(404);
    expect((await gate(get(), "", page, NOW, true)).status).toBe(404);
  });
  it("is open only when the one flag (gate.on) is false", async () => {
    expect((await gate(get(), PASS, page, NOW, false)).status).toBe(200);
  });
  it("is on in the repo, covers the page and all its files, and follows the route", () => {
    expect(DATA.gate.on).toBe(true);
    expect(config.path).toEqual(["/" + DATA.route, "/" + DATA.route + ".html", "/" + DATA.route + "/*"]);
    expect(JSON.stringify(DATA)).not.toMatch(/"(salt|sha256|k)"\s*:/);
    expect(fs.readFileSync("netlify/edge-functions/recharge-gate.ts", "utf8")).not.toMatch(/RECHARGE_PASS\s*=\s*["']/);
  });
});
