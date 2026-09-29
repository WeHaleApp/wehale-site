// QR codes for the campaign page (docs/recharge/README.md). Every QR code points at the landing page, never straight
// at the store: the page carries the channel and the code into the OneLink.
//
//   node scripts/recharge-qr.mjs [outDir]                       newsletter, flyer, pdp (the campaign code)
//   node scripts/recharge-qr.mjs [outDir] influencers.csv       plus one per influencer: CSV with a header row and
//                                                              the columns name,code (other columns are ignored)
//   RECHARGE_CODES=<file.json>                                 the channel codes that must not be in this public repo
//                                                              (they contain the partner's name): {"flyer": "…", "pdp": "…"};
//                                                              each rides in its URL as ?c=. Keep the file outside the repo.
// Writes <name>.svg and <name>.png (1200 px, for print) and urls.csv. The URLs work once the gate is off (launch);
// before that they show the 404, by design.
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import DATA from "../src/data/recharge.json" with { type: "json" };
import { cleanCode } from "../src/scripts/recharge/link.js";

const BASE = process.env.RECHARGE_URL || "https://wehale.io/" + DATA.route;
const out = process.argv[2] || "qr";
const csv = process.argv[3];
fs.mkdirSync(out, { recursive: true });

// the code the page itself gives a channel (by_channel, else the default); a QR code adds ?c= only when it differs
const pageCode = (ch) => cleanCode((DATA.code.by_channel || {})[ch], DATA.code.default);
const pageUrl = (ch, code) => {
  const q = new URLSearchParams({ ch });
  if (code && code !== pageCode(ch)) q.set("c", code);
  return BASE + "?" + q.toString();
};
const LOCAL = process.env.RECHARGE_CODES ? JSON.parse(fs.readFileSync(process.env.RECHARGE_CODES, "utf8")) : {};
const rows = ["newsletter", "flyer", "pdp"].map((ch) => ({ name: ch, ch, code: cleanCode(LOCAL[ch], pageCode(ch)) }));
for (const r of rows) if (r.ch !== "newsletter" && !LOCAL[r.ch]) console.warn(`warning: no code for ${r.ch} in RECHARGE_CODES; it falls back to ${r.code}`);
if (csv) {
  const lines = fs.readFileSync(csv, "utf8").split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split(",").map((h) => h.trim().toLowerCase());
  const iName = head.indexOf("name"), iCode = head.indexOf("code");
  if (iCode < 0) throw new Error("the CSV needs a 'code' column (and optionally 'name')");
  for (const l of lines) {
    const cols = l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const code = cleanCode(cols[iCode], null);
    if (!code) continue;
    rows.push({ name: "influencer-" + code.toLowerCase(), ch: "influencer", code, who: iName >= 0 ? cols[iName] : "" });
  }
}
const opts = { margin: 4, errorCorrectionLevel: "M", color: { dark: "#0b0610", light: "#ffffff" } };
const index = ["name,channel,code,url"];
for (const r of rows) {
  const url = pageUrl(r.ch, r.code);
  fs.writeFileSync(path.join(out, r.name + ".svg"), await QRCode.toString(url, { ...opts, type: "svg" }));
  await QRCode.toFile(path.join(out, r.name + ".png"), url, { ...opts, type: "png", width: 1200 });
  index.push([r.name, r.ch, r.code, url].join(","));
  console.log(r.name.padEnd(28), url);
}
fs.writeFileSync(path.join(out, "urls.csv"), index.join("\n") + "\n");
