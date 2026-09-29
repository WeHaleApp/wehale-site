// The campaign page's link (src/scripts/recharge/link.js). Run: npm test
import { describe, it, expect } from "vitest";
import DATA from "../src/data/recharge.json";
import { readCampaign, campaignLink, cleanCode, phoneOf } from "../src/scripts/recharge/link.js";

const params = (url) => Object.fromEntries(new URL(url).searchParams);

describe("readCampaign", () => {
  it("reads the channel and the code, defaulting to web and the campaign code", () => {
    expect(readCampaign("", "", DATA)).toMatchObject({ ch: "web", code: "RECHARGE" });
    expect(readCampaign("?ch=Flyer&c=anna-rc", "", DATA)).toMatchObject({ ch: "flyer", code: "ANNA-RC" });
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
    expect(params(u)).toEqual({ pid: DATA.onelink.pid, c: "recharge", deep_link_value: "RECHARGE", af_sub1: "newsletter", af_sub5: "at=offer" });
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

describe("the gate", () => {
  it("is on until launch, with a salted SHA-256 and no key in the repo", () => {
    expect(DATA.gate.on).toBe(true);
    expect(DATA.gate.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(DATA)).not.toMatch(/"k"\s*:/);
  });
});
