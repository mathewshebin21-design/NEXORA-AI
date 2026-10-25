/**
 * Deterministic marketing metric formulas.
 *
 * Every metric is plain arithmetic over raw, sourced inputs. Division by
 * zero returns `null` (rendered as "—") rather than 0 or Infinity, so a
 * missing denominator is never mistaken for a real result.
 */

export type RawPerformance = {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  /** Cost of goods sold attributable to the revenue. */
  cogs?: number;
  newCustomers?: number;
};

export const safeDiv = (num: number, den: number): number | null =>
  den === 0 || !Number.isFinite(den) ? null : num / den;

export const ctr = (clicks: number, impressions: number) => safeDiv(clicks, impressions);
export const cpc = (spend: number, clicks: number) => safeDiv(spend, clicks);
export const cpm = (spend: number, impressions: number) => {
  const v = safeDiv(spend, impressions);
  return v === null ? null : v * 1000;
};
export const conversionRate = (conversions: number, clicks: number) => safeDiv(conversions, clicks);
export const cpa = (spend: number, conversions: number) => safeDiv(spend, conversions);
export const cac = (spend: number, newCustomers: number) => safeDiv(spend, newCustomers);
export const roas = (revenue: number, spend: number) => safeDiv(revenue, spend);
export const grossMargin = (revenue: number, cogs: number) => revenue - cogs;
export const grossMarginRate = (revenue: number, cogs: number) => safeDiv(revenue - cogs, revenue);
/** Profit after media cost: gross margin minus spend. */
export const campaignProfit = (revenue: number, cogs: number, spend: number) => revenue - cogs - spend;

/**
 * Simple LTV: average order value × purchase frequency × gross margin rate
 * × expected customer lifespan (in the same period unit as frequency).
 */
export const lifetimeValue = (aov: number, purchasesPerYear: number, marginRate: number, lifespanYears: number) =>
  aov * purchasesPerYear * marginRate * lifespanYears;

/** Retention = customers retained from the start cohort (excluding new) / start cohort. */
export const retentionRate = (startCustomers: number, endCustomers: number, newCustomers: number) =>
  safeDiv(endCustomers - newCustomers, startCustomers);

export function summarize(p: RawPerformance) {
  return {
    ctr: ctr(p.clicks, p.impressions),
    cpc: cpc(p.spend, p.clicks),
    cpm: cpm(p.spend, p.impressions),
    cvr: conversionRate(p.conversions, p.clicks),
    cpa: cpa(p.spend, p.conversions),
    cac: p.newCustomers === undefined ? null : cac(p.spend, p.newCustomers),
    roas: roas(p.revenue, p.spend),
    grossMargin: p.cogs === undefined ? null : grossMargin(p.revenue, p.cogs),
    profit: p.cogs === undefined ? null : campaignProfit(p.revenue, p.cogs, p.spend),
  };
}

export function sumPerformance<T extends RawPerformance>(rows: T[]): RawPerformance {
  return rows.reduce<RawPerformance>(
    (acc, r) => ({
      spend: acc.spend + r.spend,
      impressions: acc.impressions + r.impressions,
      clicks: acc.clicks + r.clicks,
      conversions: acc.conversions + r.conversions,
      revenue: acc.revenue + r.revenue,
      cogs: (acc.cogs ?? 0) + (r.cogs ?? 0),
      newCustomers: (acc.newCustomers ?? 0) + (r.newCustomers ?? 0),
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, cogs: 0, newCustomers: 0 },
  );
}

/** Formula catalogue — shown in the UI as metric lineage. */
export const METRIC_DEFINITIONS: Record<string, { label: string; formula: string; inputs: string[] }> = {
  ctr: { label: "Click-through rate", formula: "clicks ÷ impressions", inputs: ["ad_platform.clicks", "ad_platform.impressions"] },
  cpc: { label: "Cost per click", formula: "spend ÷ clicks", inputs: ["ad_platform.spend", "ad_platform.clicks"] },
  cpm: { label: "Cost per mille", formula: "spend ÷ impressions × 1,000", inputs: ["ad_platform.spend", "ad_platform.impressions"] },
  cvr: { label: "Conversion rate", formula: "conversions ÷ clicks", inputs: ["measured.orders", "ad_platform.clicks"] },
  cpa: { label: "Cost per acquisition", formula: "spend ÷ conversions", inputs: ["ad_platform.spend", "measured.orders"] },
  cac: { label: "Customer acquisition cost", formula: "spend ÷ new customers", inputs: ["ad_platform.spend", "commerce.new_customers"] },
  roas: { label: "Return on ad spend", formula: "attributed revenue ÷ spend", inputs: ["attribution.revenue", "ad_platform.spend"] },
  margin: { label: "Gross margin", formula: "revenue − COGS", inputs: ["commerce.revenue", "commerce.cogs"] },
  profit: { label: "Campaign profit", formula: "revenue − COGS − spend", inputs: ["commerce.revenue", "commerce.cogs", "ad_platform.spend"] },
};
