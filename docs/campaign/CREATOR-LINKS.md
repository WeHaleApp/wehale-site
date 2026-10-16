# Two kinds of code, two kinds of link

| | Customers (pack, email, social) | Creators / influencers |
|---|---|---|
| Lands on | the landing page, then the store | **straight to the store / app**, no page |
| Code | the campaign's customer code (by channel, or `?c=`) | their own code (lifetime access in the app, no purchase) |
| Link | `wehale.io/campaign/charge-your-current?utm_source=salte&utm_medium=...` | a direct OneLink (below) |
| AppsFlyer media source (`pid`) | `partner_campaign` | `partner_creators` (**proposed**, Isak/measurement lead confirm the name in `recharge.json` `onelink.creator_pid`) |
| Channel the app reports (`deep_link_sub1`) | `newsletter`, `pdp`, `social`, `web` | `influencer` |
| Page events (pixels) | yes, with consent | none: they never touch the page |

The two are told apart in three places: AppsFlyer (`pid`), the app/server funnel (channel `influencer`, and the code itself, which the app already treats differently), and the link's `af_sub5` (`at=direct` for creators, `at=offer` / `at=qr` for the page).

## Recipe: a creator's link
Never a bare store URL: a store link cannot carry the code through the install. Use the OneLink (it opens the app if installed, else the App Store / Google Play, and hands the code to the app on first open; the code is also editable at sign-up as the manual fallback):

`https://wehale.onelink.me/zcid?pid=partner_creators&c=recharge&deep_link_value=<CODE>&deep_link_sub1=influencer&deep_link_sub2=<CODE>&af_sub1=influencer&af_channel=salte&af_ad=<creator-name>&af_sub5=at%3Ddirect%3Bmed%3D<platform>%3Bcamp%3Dcharge-your-current`

Generate them from a CSV (`name,code,platform`; kept outside the repo, codes are private):
`node scripts/creator-links.mjs creators.csv > creator-links.tsv`

On a desktop a OneLink goes to wehale.io without a code (template default), so creators should post the link where it is tapped on a phone (bio, story, caption), not as a desktop URL. Real-phone tests: `docs/recharge/LINK-MATRIX.md`.

## UTM scheme for Salte (Lovisa), links to the page
`utm_source=salte`, `utm_medium=<email|instagram|tiktok|pack-qr|creator-name>`, `utm_campaign=charge-your-current`, optional `utm_content`.
The page reads them and: sends them with every pixel/GTM event (after consent); passes them to the OneLink (`af_channel`=source, `af_ad`=content, `af_sub5` = `med=` and `camp=`); and, with no `?ch=`, maps the medium to the channel (`email`->newsletter, `pack-qr` and `website`->pdp (product page), `instagram`/`tiktok`->social, anything else -> web). A `utm_campaign` never replaces the campaign.
Example: `https://wehale.io/campaign/charge-your-current?utm_source=salte&utm_medium=pack-qr&utm_campaign=charge-your-current`
