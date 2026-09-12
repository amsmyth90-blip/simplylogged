export const PAID_PLAN_IDS = ["STARTER", "PLUS", "FAMILY"] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

// Prices are stored in pence. Checkout and entitlements must be enforced server-side.
export const PRICING_PLANS = [
  { id: "STARTER", name: "Starter", monthlyPricePence: 599, storageGb: 5, storageBytes: 5 * 1024 ** 3 },
  { id: "PLUS", name: "Plus", monthlyPricePence: 999, storageGb: 25, storageBytes: 25 * 1024 ** 3 },
  { id: "FAMILY", name: "Family", monthlyPricePence: 1599, storageGb: 100, storageBytes: 100 * 1024 ** 3 },
] as const satisfies readonly {
  id: PaidPlanId;
  name: string;
  monthlyPricePence: number;
  storageGb: number;
  storageBytes: number;
}[];

export const PRICING_CURRENCY = "GBP";
export const PRICING_INTERVAL = "month";

export function formatPlanPrice(pricePence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: PRICING_CURRENCY,
  }).format(pricePence / 100);
}
