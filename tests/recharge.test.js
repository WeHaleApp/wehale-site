// The campaign page's link (src/scripts/recharge/link.js). Run: npm test
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import DATA from "../src/data/recharge.json";
import { readCampaign, campaignLink, cleanCode, phoneOf, testCodeFrom, quickStartLink, inAppBrowser } from "../src/scripts/recharge/link.js";

const params = (url) => Object.fromEntries(new URL(url).searchParams);

describe("readCampaign", () => {
  it("reads the channel and the code, defaulting to web and the campaign code", () => {
    expect(readCampaign("", "", DATA)).toMatchObject({ ch: "web", code: "RECHARGE" });
    expect(readCampaign("?ch=Influencer&c=anna-rc", "", DATA)).toMatchObject({ ch: "influencer", code: "ANNA-RC" });
  });
  it("uses the channel's code when there is no ?c=, and ?c= always wins", () => {
    const D = { ...DATA, code: { default: "RECHARGE", by_channel: { newsletter: "RECHARGE", pdp: "PDPCODE" } } };
    expect(readCampaign("?ch=pdp", "", D).code).toBe("PDPCODE");
    expect(readCampaign("?ch=pdp&c=OTHER", "", D).code).toBe("OTHER");
    expect(readCampaign("?ch=social", "", D).code).toBe("RECHARGE");
  });
  it("keeps codes that name the partner out of this public repo", () => {
    expect(JSON.stringify(DATA.code)).not.toMatch(/FLYER|PRODUKT/);
  });
  it("ignores an unknown channel and cleans the code", () => {
    expect(readCampaign("?ch=spam&c=<x>%20y", "", DATA)).toMatchObject({ ch: "web", code: "XY" });
    expect(cleanCode("", "RECHARGE")).toBe("RECHARGE");
    expect(cleanCode("a".repeat(50), "R")).toHaveLength(32);
  });
});

describe("campaignLink", () => {
  it("carries pid, c=recharge, the code in deep_link_value and the channel in af_sub1", () => {
    const u = campaignLink(DATA, { ...readCampaign("?ch=newsletter", "", DATA), at: "offer" });
    expect(u.startsWith("https://wehale.onelink.me/zcid?")).toBe(true);
    expect(params(u)).toEqual({ pid: DATA.onelink.pid, c: "recharge", deep_link_value: "RECHARGE", af_sub1: "newsletter", deep_link_sub1: "newsletter", deep_link_sub2: "RECHARGE", af_sub5: "at=offer" });
  });
  it("passes the UTMs on, and a utm_campaign never replaces c", () => {
    const u = campaignLink(DATA, readCampaign("?ch=influencer&c=ANNA-RC&utm_source=ig&utm_medium=social&utm_campaign=x&utm_content=story1", "", DATA));
    expect(params(u)).toMatchObject({ c: "recharge", deep_link_value: "ANNA-RC", af_sub1: "influencer", af_channel: "ig", af_ad: "story1", af_sub5: "med=social;camp=x" });
  });
});

describe("phoneOf", () => {
  it("tells iPhone, iPad and Android from desktop", () => {
    expect(phoneOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("ios");
    expect(phoneOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe("ios");
    expect(phoneOf("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("android");
    expect(phoneOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe(null);
  });
});

describe("the copy", () => {
  it("says the decided offer exactly, and nothing it must not", () => {
    expect(DATA.copy.offer_1).toBe("Your first month of WeHale free.");
    expect(JSON.stringify(DATA.copy)).not.toMatch(/499|kr/);
    expect(DATA.copy.trial).toBe("The free month is a trial through the App Store or Google Play.");   // Isak, 7 Oct: the store line alone (P1); the unverified "Cancel anytime" line is gone (P3)
    expect(DATA.copy.offer_2).toBeUndefined();
    expect(DATA.copy.qr).toBeUndefined();   // P5: no desktop caption under the QR code
    expect(DATA.copy.cta).toBe("Start in the app");   // P4
    expect(DATA.inapp.on).toBe(true);
    const all = Object.entries(DATA.copy).filter(([k]) => !k.startsWith("_")).map(([, v]) => v).join(" ").toLowerCase();
    expect(all).not.toMatch(/30 days|no card|1 minute|one minute/);
  });
});

describe("the tester's quick start link", () => {
  it("reads the team test code from the #fragment only, upper-cased", () => {
    expect(testCodeFrom("#test=abc123")).toBe("ABC123");
    expect(testCodeFrom("#x=1&test=ABC123&y=2")).toBe("ABC123");
    expect(testCodeFrom("?test=ABC123")).toBe(null);
    expect(testCodeFrom("")).toBe(null);
  });
  it("accepts only a plain code, so a fragment cannot inject into the link", () => {
    expect(testCodeFrom("#test=ab")).toBe(null);
    expect(testCodeFrom("#test=a%20b")).toBe(null);
    expect(testCodeFrom("#test=a/../b")).toBe(null);
    expect(testCodeFrom("#test=" + "A".repeat(41))).toBe(null);
  });
  it("builds the app's quick-start link, and nothing without a code", () => {
    expect(quickStartLink("abc123")).toBe("wehale:///quick-start?code=ABC123");
    expect(quickStartLink("")).toBe(null);
    expect(quickStartLink("a b")).toBe(null);
  });
});

describe("inAppBrowser", () => {
  const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)";
  it("names the apps whose own browser it is", () => {
    expect(inAppBrowser(IOS + " Mobile/15E148 Instagram 350.0.0.0.0 (iPhone14,5; iOS 18_0)")).toEqual({ name: "Instagram", os: "ios" });
    expect(inAppBrowser(IOS + " Mobile/15E148 [FBAN/FBIOS;FBAV/480.0;FBDV/iPhone14,5]")).toEqual({ name: "Facebook", os: "ios" });
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 musical_ly_35.0.0 trill_350000")).toEqual({ name: "TikTok", os: "android" });
    expect(inAppBrowser(IOS + " Mobile/15E148 Snapchat/12.0")).toEqual({ name: "Snapchat", os: "ios" });
  });
  it("catches an unnamed web view, and leaves real browsers alone", () => {
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 Version/4.0 Chrome/120 Mobile Safari/537.36")).toEqual({ name: "this app", os: "android" });
    expect(inAppBrowser(IOS + " Mobile/15E148")).toEqual({ name: "this app", os: "ios" });
    expect(inAppBrowser(IOS + " Version/18.0 Mobile/15E148 Safari/604.1")).toBe(null);
    expect(inAppBrowser(IOS + " CriOS/120.0 Mobile/15E148 Safari/604.1")).toBe(null);
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36")).toBe(null);
    expect(inAppBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120 Safari/537.36")).toBe(null);
  });
});

describe("the campaign's media stays out of git (this repo is public)", () => {
  it("is ignored: the loop, the poster, the page's screenshots and recording, the partner's real logo", () => {
    const ig = fs.readFileSync(".gitignore", "utf8");
    for (const p of ["public/recharge/ink-long.mp4", "public/recharge/ink-poster.webp", "public/recharge/*.local.*", "docs/recharge/evidence/*.jpg", "docs/recharge/evidence/*.webm"]) expect(ig).toContain(p);
  });
});
