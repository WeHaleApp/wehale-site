/**
 * One partner = one JSON file in src/data/partners/. The page at /for/<slug> renders it;
 * /for renders GENERIC. Fields mirror the API's `partners` table where one exists
 * (name, contact, code, offerDays, commission*), so moving the data into the panel later is a
 * rename, not a redesign. CR-0.20 owns the model; this file owns the shape the site reads.
 */
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
  /** The code the partner's own team types in the app. Mirrors partners.code / offer_days. */
  teamCode: string;
  teamCodeDays: number;
  /** The guest offer in their checkout. */
  guestDiscountMonthly: number;
  guestDiscountAnnual: number;
  guestTrialDays: number;
  annualPrice: number;
  monthlyPrice: number;
  /** Mirrors partners.commission_percent / commission_months. */
  commissionPercent: number;
  commissionMonths: number;
  /** Their numbers, for the calculator and the checkout mock. Editable on the page. */
  avgOrder: number;
  ordersPerMonth: number;
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
  teamCode: "DINSTUDIO-TEAM",
  teamCodeDays: 90,
  guestDiscountMonthly: 100,
  guestDiscountAnnual: 500,
  guestTrialDays: 30,
  annualPrice: 999,
  monthlyPrice: 179,
  commissionPercent: 20,
  commissionMonths: 12,
  avgOrder: 795,
  ordersPerMonth: 400,
  commonPurchase: "Yoga · 10-klippkort",
  accent: "#0f766e",
};

export function loadPartners(): Partner[] {
  const mods = import.meta.glob("../data/partners/*.json", { eager: true }) as Record<
    string,
    { default?: Partner } & Partner
  >;
  return Object.values(mods).map((m) => ({ ...GENERIC, ...(m.default ?? m) }));
}

export const APP_STORE_URL = "https://apps.apple.com/se/app/wehale/id6739413667";

export function kr(n: number): string {
  return Math.round(n).toLocaleString("sv-SE").replace(/ /g, " ") + " kr";
}
