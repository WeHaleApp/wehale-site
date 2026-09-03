/**
 * One partner = one JSON file in src/data/partners/. The page at /for/<slug> renders it;
 * /for renders GENERIC. Fields mirror the API's `partners` table where one exists
 * (name, contact, code, offerDays, commission*), so moving the data into the panel later is a
 * rename, not a redesign. CR-0.20 owns the model; this file owns the shape the site reads.
 *
 * Three ways to work together (Isak, 2026-09-03), selectable per partner:
 *   checkout  We finance a discount on THEIR products; the guest gets WeHale Pro; they get a
 *             conversion lift at zero cost. No kick-back.
 *   referral  They recommend WeHale with an offer we configure (90 days free, or 50 % off the
 *             annual plan); when a guest becomes paying they get X % of everything that guest
 *             buys, for N months. Martin's model.
 *   gift      Pure value-add: 90 days of WeHale Pro to their guests, in their name. No money.
 */
export type PartnerModel = "checkout" | "referral" | "gift";
export type ReferralOffer = "trial90" | "annual50";

export interface Partner {
  /** URL segment. Unguessable enough for an invitation link: use the studio name, not a number. */
  slug: string;
  name: string;
  /** "yogastudio", "andningslärare", "retreat", "plattform" — used in copy. */
  kind?: string;
  city?: string;
  /** Their contact person, first name. Personalises the greeting. */
  contactName?: string;
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
  /** The referral model: offer shape, commission. Mirrors partners.commission_percent / _months. */
  referralOffer: ReferralOffer;
  commissionPercent: number;
  commissionMonths: number;
  /** Their numbers, for the calculators and the checkout mock. Editable on the page. */
  avgOrder: number;
  ordersPerMonth: number;
  guestsPerMonth: number;
  commonPurchase: string;
  checkoutSystem?: string;
  /** Optional branding for the checkout mock. */
  logo?: string;
  accent?: string;
  quote?: string;
}

export const GENERIC: Partner = {
  slug: "",
  name: "Din studio",
  kind: "studio",
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
  referralOffer: "trial90",
  commissionPercent: 20,
  commissionMonths: 12,
  avgOrder: 795,
  ordersPerMonth: 400,
  guestsPerMonth: 300,
  commonPurchase: "Yoga · 10-klippkort",
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

export function kr(n: number): string {
  return Math.round(n).toLocaleString("sv-SE").replace(/ /g, " ") + " kr";
}
