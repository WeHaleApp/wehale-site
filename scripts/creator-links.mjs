// Direct links for creators/influencers, who do NOT land on the page (docs/campaign/CREATOR-LINKS.md): a OneLink that goes straight to the
// App Store / Google Play (or opens the app) and carries their code, so it works without the landing page. Usage:
//   node scripts/creator-links.mjs creators.csv > creator-links.tsv        CSV with a header row and columns name,code[,platform]
// The codes are private: the CSV and the output stay outside the repo, and nothing is printed except the links themselves.
import fs from "node:fs";
import DATA from "../src/data/recharge.json" with { type: "json" };
import { campaignLink, cleanCode } from "../src/scripts/recharge/link.js";

export function creatorLink(data, { name, code, platform }) {
  const pid = data.onelink.creator_pid;
  const slug = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const contract = { utm_source: "salte", utm_medium: String(platform || "creator").toLowerCase().replace(/[^a-z0-9-]/g, ""), utm_campaign: "charge-your-current", utm_content: slug };
  return campaignLink({ ...data, onelink: { ...data.onelink, pid } }, { ch: "influencer", code: cleanCode(code, data.code.default), contract, at: "direct" });
}
if (process.argv[1] && process.argv[1].endsWith("creator-links.mjs") && process.argv[2]) {
  const [head, ...rows] = fs.readFileSync(process.argv[2], "utf8").trim().split(/\r?\n/).map((l) => l.split(",").map((x) => x.trim()));
  const ix = (n) => head.map((h) => h.toLowerCase()).indexOf(n);
  for (const r of rows) {
    if (!r[ix("code")]) { console.error(`skipped ${r[ix("name")]}: no code`); continue; }
    console.log([r[ix("name")], creatorLink(DATA, { name: r[ix("name")], code: r[ix("code")], platform: ix("platform") >= 0 ? r[ix("platform")] : "" })].join("\t"));
  }
}
