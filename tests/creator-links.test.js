// Creator links skip the landing page (docs/campaign/CREATOR-LINKS.md). Run: npm test
import { describe, it, expect } from "vitest";
import DATA from "../src/data/recharge.json";
import { creatorLink } from "../scripts/creator-links.mjs";

describe("creatorLink", () => {
  const p = (u) => Object.fromEntries(new URL(u).searchParams);
  it("goes straight to the OneLink with the creator's code, its own media source and the influencer channel", () => {
    const u = creatorLink(DATA, { name: "Test Creator", code: "abc-1", platform: "TikTok" });
    expect(u.startsWith(DATA.onelink.base + "?")).toBe(true);
    expect(p(u)).toMatchObject({ pid: DATA.onelink.creator_pid, deep_link_value: "ABC-1", deep_link_sub1: "influencer", deep_link_sub2: "ABC-1", af_channel: "salte", af_ad: "test-creator" });
    expect(p(u).pid).not.toBe(DATA.onelink.pid);
    expect(p(u).af_sub5).toBe("at=direct;med=tiktok;camp=charge-your-current");
  });
});
