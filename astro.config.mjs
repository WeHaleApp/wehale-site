// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";

// The campaign page's path, set in one place (src/data/recharge.json: route). It stays out of the sitemap, and its
// noindex headers are written into dist/_headers at build (Netlify merges them with netlify.toml).
const CAMPAIGN = JSON.parse(fs.readFileSync(new URL("./src/data/recharge.json", import.meta.url), "utf8"));
const CAMPAIGN_RE = new RegExp("/" + CAMPAIGN.route + "(/|\\.html|$)");
const campaignHeaders = {
  name: "campaign-headers",
  hooks: {
    "astro:build:done": ({ dir }) => {
      const r = "/" + CAMPAIGN.route, page = "  X-Robots-Tag: noindex, nofollow, noarchive\n  Referrer-Policy: same-origin\n  Cache-Control: private, no-store\n";
      const block = `${r}\n${page}${r}.html\n${page}${r}/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n`;
      const f = new URL("_headers", dir);
      fs.appendFileSync(f, (fs.existsSync(f) ? "\n" : "") + block);
    },
  },
};

export default defineConfig({
  site: "https://wehale.io",
  trailingSlash: "never",
  build: {
    inlineStylesheets: "auto",
    // "file" emits /about.html instead of /about/index.html so Netlify
    // serves /about with a 200 directly — the directory format caused a
    // 301 redirect on every subpage (trailingSlash mismatch).
    format: "file",
  },
  integrations: [
    sitemap({
      // Out of the sitemap: the 404, the partner pages (/for, unlisted by design, DIRECTION.md §5) if present, and the
      // confidential campaign page (CAMPAIGN.route, docs/recharge/README.md).
      filter: (page) => !/\/404(\.html)?$/.test(page) && !/\/for(\/|$)/.test(page) && !CAMPAIGN_RE.test(page),
      changefreq: "weekly",
      priority: 0.7,
    }),
    campaignHeaders,
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
