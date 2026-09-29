// The ad-to-site parameter contract (SITE-GOALS §4): every event carries it, every app link passes it into the OneLink.
// Run: npm test
import { describe, it, expect, beforeAll, vi } from "vitest";
import { readContract, eventParams, carryHref, oneLinkUrl, CONTRACT_KEYS } from "../src/scripts/contract.js";

const AD = "?h=coffee&s=wake-up&v=land&src=adpreview&utm_source=meta&utm_medium=paid_social&utm_campaign=q4_foggy&utm_content=coffee_45s_v2&fbclid=abc";

describe("readContract", () => {
  it("reads every key of the contract, and source from utm_source", () => {
    const c = readContract(AD, "https://l.instagram.com/");
    expect(c).toEqual({ h: "coffee", s: "wake-up", v: "land", src: "adpreview", utm_source: "meta", utm_medium: "paid_social",
      utm_campaign: "q4_foggy", utm_content: "coffee_45s_v2", source: "meta" });
  });
  it("derives source from the click id, then the referrer, then direct", () => {
    expect(readContract("?fbclid=x").source).toBe("meta");
    expect(readContract("?ttclid=x").source).toBe("tiktok");
    expect(readContract("", "https://www.google.com/search").source).toBe("www.google.com");
    expect(readContract("", "").source).toBe("direct");
  });
  it("clips values and drops unsafe characters (no markup, no personal free text)", () => {
    const c = readContract("?utm_content=" + encodeURIComponent('<script>"x"</script>') + "&h=" + "a".repeat(300));
    expect(c.utm_content).toBe("scriptx/script");
    expect(c.h.length).toBe(100);
  });
});

describe("eventParams", () => {
  it("puts every contract key into the event, with the event's own fields winning", () => {
    const p = eventParams(readContract(AD), { session: "unravel", arm: "none", v: "g1" });
    for (const k of CONTRACT_KEYS) expect(p).toHaveProperty(k);
    expect(p).toMatchObject({ session: "unravel", arm: "none", v: "g1", source: "meta", utm_content: "coffee_45s_v2", h: "coffee" });
  });
  it("carries only source when the visitor came with nothing", () => {
    expect(eventParams(readContract(""), { page: "home" })).toEqual({ source: "direct", page: "home" });
  });
});

describe("carryHref", () => {
  const c = readContract(AD);
  it("passes the contract on to /breathe and keeps what the link already says", () => {
    const u = new URL(carryHref("/breathe?s=unravel", c), "https://wehale.io");
    expect(u.searchParams.get("s")).toBe("unravel");
    expect(u.searchParams.get("h")).toBe("coffee");
    expect(u.searchParams.get("utm_campaign")).toBe("q4_foggy");
  });
  it("leaves external, mail and hash links alone", () => {
    expect(carryHref("https://apps.apple.com/app/id1", c)).toBe("https://apps.apple.com/app/id1");
    expect(carryHref("mailto:hello@wehale.io", c)).toBe("mailto:hello@wehale.io");
    expect(carryHref("#get-the-app", c)).toBe("#get-the-app");
  });
});

describe("oneLinkUrl: the contract passes through into the OneLink", () => {
  const base = "https://wehale.onelink.me/zcid";
  it("maps utm_campaign to c, source to af_channel, h to af_adset, utm_content to af_ad, the rest to af_sub5", () => {
    const u = new URL(oneLinkUrl(base, { pid: "web_session", campaign: "breathe", contract: readContract(AD), session: "wake-up", completed: true, at: "end", v: "g1" }));
    const q = Object.fromEntries(u.searchParams);
    expect(q).toMatchObject({ pid: "web_session", c: "q4_foggy", af_channel: "meta", af_adset: "coffee", af_ad: "coffee_45s_v2", af_sub3: "wake-up", af_sub4: "1" });
    expect(q.af_sub5).toBe("at=end;v=g1;src=adpreview;med=paid_social");
    expect(q.deep_link_value).toBeUndefined();
  });
  it("falls back to the surface's campaign and adds the offer token only when an offer arm exists", () => {
    const a = { offerId: "WSOCT01", arm: "B", assignmentId: "7KQ2M9XW3T" };
    const q = new URL(oneLinkUrl(base, { pid: "web_session", campaign: "breathe", contract: {}, session: "unravel", completed: true, assignment: a, token: "WO.WSOCT01.B.7KQ2M9XW3T", at: "end" })).searchParams;
    expect(q.get("c")).toBe("breathe");
    expect(q.get("deep_link_value")).toBe("WO.WSOCT01.B.7KQ2M9XW3T");
    expect(q.get("af_sub1")).toBe("WSOCT01");
    expect(q.get("af_sub2")).toBe("B");
  });
  it("is off without a base", () => { expect(oneLinkUrl(null, { pid: "x" })).toBeNull(); });
});

describe("/breathe OneLink (offers.js) uses the contract", () => {
  it("carries the ad into the end-screen link", async () => {
    const { oneLink, setLinkContext } = await import("../src/scripts/breathe/offers.js");
    setLinkContext({ contract: readContract(AD), v: "g1" });
    const q = new URL(oneLink({ session: "wake-up", completed: false, assignment: null, at: "saved" })).searchParams;
    expect(q.get("pid")).toBe("web_session");
    expect(q.get("c")).toBe("q4_foggy");
    expect(q.get("af_ad")).toBe("coffee_45s_v2");
    expect(q.get("af_sub4")).toBe("0");
    expect(q.get("af_sub5")).toBe("at=saved;v=g1;src=adpreview;med=paid_social");
  });
});

// ---- events: a minimal browser, then the real tags.js and measure.js ----
function fakeBrowser(search) {
  const store = new Map();
  const beacons = [], scripts = [];
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  globalThis.location = new URL("https://wehale.io/breathe" + search);
  globalThis.document = { cookie: "_fbp=fb.1.1700000000.123", head: { appendChild: (s) => scripts.push(s.src) }, documentElement: {}, createElement: () => ({}) };
  globalThis.navigator = { sendBeacon: (url, blob) => { beacons.push({ url, blob }); return true; } };
  globalThis.Blob = class { constructor(parts) { this.text = parts.join(""); } };
  const fbq = vi.fn();
  globalThis.window = globalThis;
  window.dataLayer = [];
  window.__WH_SERVER = { meta: true, tiktok: false };
  return { beacons, scripts, fbq, store };
}

describe("events carry the contract (tags.js + measure.js)", () => {
  let env;
  beforeAll(() => {
    vi.stubEnv("PUBLIC_META_PIXEL_ID", "123456789");
    vi.stubEnv("PUBLIC_GTM_ID", "GTM-TEST");
    env = fakeBrowser(AD);
  });

  it("sends nothing and loads nothing before consent", async () => {
    const tags = await import("../src/scripts/tags.js");
    tags.startTags();
    expect(tags.send("SessionStart", { session: "wake-up" })).toBeNull();
    expect(env.scripts).toEqual([]);
    expect(env.beacons).toEqual([]);
  });

  it("after Accept: GTM and the pixel load, and every funnel event has the contract and one event_id per copy", async () => {
    const { save } = await import("../src/scripts/consent.js");
    const { track } = await import("../src/scripts/breathe/measure.js");
    save({ analytics: true, ads: true });
    expect(env.scripts.some((s) => s.includes("googletagmanager.com/gtm.js?id=GTM-TEST"))).toBe(true);
    expect(env.scripts.some((s) => s.includes("connect.facebook.net"))).toBe(true);
    const calls = [];
    window.fbq = (...a) => calls.push(a);
    const p = eventParams(readContract(AD), { session: "wake-up", arm: "none", v: "g1" });
    track.start(p);
    track.appTap({ ...p, completed: 1 });
    const names = calls.map((c) => c[1]);
    expect(names).toEqual(["SessionStart", "ViewContent", "AppTap", "Lead"]);
    for (const c of calls) {
      expect(c[2]).toMatchObject({ h: "coffee", s: "wake-up", v: "g1", src: "adpreview", utm_source: "meta", utm_medium: "paid_social", utm_campaign: "q4_foggy", utm_content: "coffee_45s_v2", source: "meta" });
      expect(c[3].eventID).toMatch(/^[\w-]{8,}$/);
    }
    // the server copy shares the pixel's event_id (de-duplication)
    const server = env.beacons.filter((b) => b.url.includes("meta-capi")).map((b) => JSON.parse(b.blob.text));
    const start = server.find((b) => b.event_name === "SessionStart");
    expect(start.event_id).toBe(calls[0][3].eventID);
    expect(start.custom_data.utm_content).toBe("coffee_45s_v2");
    expect(start.consent).toBe("granted");
    // GTM gets the same events in the dataLayer
    const dl = window.dataLayer.filter((e) => e && e.event === "SessionStart");
    expect(dl[0]).toMatchObject({ utm_campaign: "q4_foggy", event_id: calls[0][3].eventID });
  });

  it("after Decline: nothing more is sent", async () => {
    const { save } = await import("../src/scripts/consent.js");
    const tags = await import("../src/scripts/tags.js");
    save({ analytics: false, ads: false });
    const before = env.beacons.length;
    expect(tags.send("SessionFinish", { session: "wake-up" })).toBeNull();
    expect(env.beacons.length).toBe(before);
  });
});
