/**
 * One partner = one JSON file in src/data/partners/. The page at /for/<slug> renders it;
 * /for renders GENERIC. Fields mirror the API's `partners` table where one exists
 * (name, contact, code, offerDays, commission*), so moving the data into the panel later is a
 * rename, not a redesign. CR-0.20 owns the model; this file owns the shape the site reads.
 *
 * Three ways to work together (Isak, 2026-09-03), selectable per partner:
 *   checkout  We finance a discount on THEIR products; the guest gets WeHale Pro; they get a
 *             conversion lift at zero cost. No kick-back.
 *   referral  For reach: newsletters, communities, influencers, platforms. CR-0.5 (Martin's
 *             model, Isak's ten rulings 2026-08-31): X % of net after the store's share, on
 *             everything a recruited customer pays during their first 12 months, annual and
 *             monthly alike, every term configurable per partner. The audience offer is either
 *             90 days free or 50 % off the annual plan.
 *   gift      Pure value-add: 90 days of WeHale Pro to their guests, in their name. No money.
 */
export type PartnerModel = "checkout" | "referral" | "gift";

/** The names partners see. Short, concrete, from their side of the table (Isak, 2026-09-03). */
export const MODEL_NAMES: Record<PartnerModel, string> = {
  checkout: "Gåvan i kassan",
  referral: "Din länk",
  gift: "Gästkoden",
};

export interface Partner {
  /** URL segment. Unguessable enough for an invitation link: use the studio name, not a number. */
  slug: string;
  name: string;
  /** "yogastudio", "andningslärare", "retreat", "plattform" — used in copy. */
  kind?: string;
  city?: string;
  /** Their contact person, first name. Personalises the greeting. */
  contactName?: string;
  /** What they call the people they reach: "gäster" (studio), "elever" (teacher), "följare" (creator). */
  audienceWord: string;
  /** Our side. */
  ourContactName: string;
  ourContactEmail?: string;
  /** Which of the three models the page proposes. All three on the generic page. */
  models: PartnerModel[];
  /** The owner's personal, single-use lifetime code (QR on desktop). Needs the backend code type. */
  ownerCode: string;
  /** The code the partner's own team types in the app. Mirrors partners.code / offer_days. */
  teamCode: string;
  teamCodeDays: number;
  /** The guest offer in their checkout (model: checkout). */
  guestDiscountMonthly: number;
  guestDiscountAnnual: number;
  guestTrialDays: number;
  annualPrice: number;
  monthlyPrice: number;
  /** The referral model (CR-0.5): X % of net for the first N months, on annual and monthly alike. */
  commissionPercent: number;
  commissionMonths: number;
  /** The store's cut of the price, before VAT is removed. 30 % today; 15 % once the Small Business
   *  Program is approved (Isak applies, effect ~mid-October 2026). Verified at the ASC API
   *  2026-09-04: 179 kr yields 100.24 kr proceeds, which is 179 / 1.25 × 0.70. */
  storeSharePercent: number;
  /** Swedish VAT on digital subscriptions. Apple and Google remit it; it was never ours. */
  vatPercent: number;
  /** The offer the partner's audience gets. */
  referralOffer: "trial90" | "annual50";
  /** Paying customers they expect to recruit per year, for the calculator. */
  recruitsPerYear: number;
  /** Their numbers, for the calculators and the checkout mock. Editable on the page. */
  avgOrder: number;
  ordersPerMonth: number;
  guestsPerMonth: number;
  commonPurchase: string;
  /** The line under the purchase in the checkout mock. */
  purchaseNote: string;
  checkoutSystem?: string;
  /** What the browser bar shows in the checkout mock. */
  checkoutDomain: string;
  /** Their logo, shown in its own colours on a light tile (hero) and as a white silhouette in the
   *  header and cards. Most studio logos are dark-on-light; `logoOnDark: "keep"` opts out of the
   *  silhouette for a logo that already reads on dark. */
  logo?: string;
  logoOnDark?: "invert" | "keep";
  /** Their colour: the checkout mock's buttons, and a quiet tint behind the hero and the cards. */
  accent?: string;
  /** Their own line about themselves, shown under the logo in the hero. */
  quote?: string;
}

export const GENERIC: Partner = {
  slug: "",
  name: "Din studio",
  kind: "studio",
  audienceWord: "gäster",
  ourContactName: "Philip",
  models: ["checkout", "referral", "gift"],
  ownerCode: "DINSTUDIO-OWNER",
  teamCode: "DINSTUDIO-TEAM",
  teamCodeDays: 90,
  guestDiscountMonthly: 100,
  guestDiscountAnnual: 500,
  guestTrialDays: 30,
  annualPrice: 999,
  monthlyPrice: 179,
  commissionPercent: 20,
  commissionMonths: 12,
  storeSharePercent: 30,
  vatPercent: 25,
  referralOffer: "annual50",
  recruitsPerYear: 300,
  avgOrder: 795,
  ordersPerMonth: 400,
  guestsPerMonth: 300,
  commonPurchase: "Yoga · 10-klippkort",
  purchaseNote: "Gäller 6 månader · alla klasser",
  checkoutDomain: "kassa.dinstudio.se",
  accent: "#0f766e",
};

export function loadPartners(): Partner[] {
  const mods = import.meta.glob("../data/partners/*.json", { eager: true }) as Record<
    string,
    { default?: Partial<Partner> } & Partial<Partner>
  >;
  return Object.values(mods).map((m) => ({ ...GENERIC, ...(m.default ?? m) }) as Partner);
}

export const APP_STORE_URL = "https://apps.apple.com/se/app/wehale/id6739413667";
export const ONELINK_BASE = "https://wehale.onelink.me/zcid?deep_link_value=";

export function codeLink(code: string): string {
  return ONELINK_BASE + encodeURIComponent(code);
}

/** What actually reaches us from a listed price: VAT out, then the store's cut. */
export function proceeds(price: number, p: Pick<Partner, "storeSharePercent" | "vatPercent">): number {
  return (price / (1 + p.vatPercent / 100)) * (1 - p.storeSharePercent / 100);
}

export function kr(n: number): string {
  return Math.round(n).toLocaleString("sv-SE").replace(/ /g, " ") + " kr";
}
