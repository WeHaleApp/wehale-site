// Channel x device matrix for the campaign link (docs/recharge/LINK-MATRIX.md): what OneLink the page produces, and whether the app's own
// reader (wehale-app src/lib/link-attribution.ts, read from the app repo's main checkout when it is there) gets the channel and the code back.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import DATA from "../src/data/recharge.json";
import { readCampaign, campaignLink, phoneOf } from "../src/scripts/recharge/link.js";

const APP = "/Users/isakgustafsson/Documents/wehale-app/src/lib/link-attribution.ts";
const HAVE_APP = fs.existsSync(APP);
const UA = { iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", android: "Mozilla/5.0 (Linux; Android 14; Pixel 8)", desktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" };
// what app.js does: a desktop (no phone UA) draws the QR code with at=qr; a phone uses the button with at=offer
const linkFor = (search, device) => campaignLink(DATA, { ...readCampaign(search, "", DATA), at: phoneOf(UA[device], 0) ? "offer" : "qr" });
const q = (u) => Object.fromEntries(new URL(u).searchParams);

const CASES = [
  ["newsletter", "?ch=newsletter", "RECHARGE"],
  ["pdp (partner code from its own URL)", "?ch=pdp&c=Partner-Test1", "PARTNER-TEST1"],
  ["influencer (personal code)", "?ch=influencer&c=anna-rc", "ANNA-RC"],
  ["social", "?ch=social", "RECHARGE"],
  ["no channel (a bare link)", "", "RECHARGE"],
];

describe("every channel, on every device", () => {
  for (const [name, search, code] of CASES) for (const device of Object.keys(UA)) {
    it(`${name} on ${device}: one OneLink with the code, the channel and the media source`, () => {
      const p = q(linkFor(search, device));
      const ch = (/ch=([a-z]+)/.exec(search) || [, "web"])[1];
      expect(p).toMatchObject({ pid: DATA.onelink.pid, c: "recharge", deep_link_value: code, deep_link_sub1: ch, deep_link_sub2: code, af_sub1: ch });
      expect(p.af_sub5).toBe(device === "desktop" ? "at=qr" : "at=offer");
    });
  }
});

describe("a partner code beats an ad", () => {
  it("an ad's UTMs and click ids ride along but never replace the code, the campaign or the channel", () => {
    const p = q(linkFor("?ch=influencer&c=anna-rc&utm_source=meta&utm_medium=paid&utm_campaign=autumn&utm_content=ad7&fbclid=XYZ&ttclid=ABC", "iphone"));
    expect(p).toMatchObject({ c: "recharge", deep_link_value: "ANNA-RC", deep_link_sub1: "influencer", deep_link_sub2: "ANNA-RC", af_channel: "meta", af_ad: "ad7" });
    expect(p.af_sub5).toContain("camp=autumn");
    expect(Object.keys(p)).not.toContain("fbclid");
  });
  it("an ad link with no code gets the campaign code; a partner's ?c= always wins over a channel's", () => {
    expect(q(linkFor("?ch=social&utm_source=tiktok&utm_campaign=x", "android")).deep_link_value).toBe("RECHARGE");
    expect(q(linkFor("?ch=newsletter&c=anna-rc", "android")).deep_link_value).toBe("ANNA-RC");
  });
});

describe.skipIf(!HAVE_APP)("the app's own reader gets the channel and the reference from our link", () => {
  it("reads ch and c (and not the campaign name) for every case", async () => {
    const { parseLinkAttribution } = await import(/* @vite-ignore */ APP);
    for (const [, search, code] of CASES) for (const device of Object.keys(UA)) {
      const p = q(linkFor(search, device)), ch = (/ch=([a-z]+)/.exec(search) || [, "web"])[1];
      expect(parseLinkAttribution(p)).toEqual({ ch, c: code });
    }
  });
});
