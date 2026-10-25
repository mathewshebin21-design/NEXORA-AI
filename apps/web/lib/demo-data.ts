/**
 * SYNTHETIC DEMONSTRATION DATA.
 *
 * Every company, campaign, person and number in this file is fictional and
 * generated for the design previews. Nothing here comes from a real account,
 * a real provider API or real customers. The UI labels it as such.
 */
import type { ConversionPath } from "./attribution";
import type { ChannelBaseline } from "./scenario";

export const DEMO_NOTICE = "Synthetic demo data — fictional brand, no live integrations";
export const PERIOD_LABEL = "Jul 27 – Oct 24, 2026 · 90 days";

/* ------------------------------------------------------------------ PRNG */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------ Workspaces */
export const workspaces = [
  { id: "ws_lumen", name: "Lumen & Oak", industry: "DTC home goods", plan: "Agency client", color: "#c8a96a", initials: "LO" },
  { id: "ws_northwind", name: "Northwind Ledger", industry: "B2B finance SaaS", plan: "Agency client", color: "#3d7bff", initials: "NL" },
  { id: "ws_verde", name: "Verde Botanics", industry: "Clean skincare", plan: "Agency client", color: "#2ec5b6", initials: "VB" },
];
export const agency = { name: "Halcyon Growth Partners", seats: 14 };

/* -------------------------------------------------------------- Channels */
export const CHANNELS = ["Paid Search", "Paid Social", "Email", "Organic Search", "Affiliate", "Organic Social"] as const;
export type Channel = (typeof CHANNELS)[number];

export const channelColors: Record<Channel, { a: string; b: string; c: string }> = {
  "Paid Search": { a: "#9c7e45", b: "#3d7bff", c: "#22d3ee" },
  "Paid Social": { a: "#23211e", b: "#2ec5b6", c: "#8b5cf6" },
  Email: { a: "#c8a96a", b: "#8fb2ff", c: "#f472b6" },
  "Organic Search": { a: "#7d8b6f", b: "#f2b544", c: "#a3e635" },
  Affiliate: { a: "#a0574a", b: "#ff6b6b", c: "#c4b5fd" },
  "Organic Social": { a: "#8a8378", b: "#a7b3d1", c: "#a5f3fc" },
};

/* ------------------------------------------------------------- Campaigns */
export type CampaignStatus = "Live" | "Scheduled" | "Paused" | "Learning" | "Draft";
export type Campaign = {
  id: string;
  name: string;
  channel: Channel;
  platform: string;
  status: CampaignStatus;
  objective: string;
  owner: string;
  start: string;
  end: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  /** As reported by the ad platform's own attribution. */
  platformConversions: number;
  /** Orders matched in first-party commerce data (independently measured). */
  measuredConversions: number;
  revenue: number;
  cogs: number;
  newCustomers: number;
  conversions: number;
};

const c = (x: Omit<Campaign, "conversions" | "cogs"> & { cogsRate?: number }): Campaign => ({
  ...x,
  conversions: x.measuredConversions,
  cogs: Math.round(x.revenue * (x.cogsRate ?? 0.42)),
});

export const campaigns: Campaign[] = [
  c({ id: "CMP-1041", name: "Autumn Hearth Collection", channel: "Paid Social", platform: "Meta Ads", status: "Live", objective: "Purchases", owner: "Ana Ribeiro", start: "2026-09-02", end: "2026-11-15", budget: 64000, spend: 48200, impressions: 6120000, clicks: 71400, platformConversions: 1912, measuredConversions: 1486, revenue: 211400, newCustomers: 1102 }),
  c({ id: "CMP-1007", name: "Brand Search — Always On", channel: "Paid Search", platform: "Google Ads", status: "Live", objective: "Purchases", owner: "Dev Malhotra", start: "2026-01-01", end: "2026-12-31", budget: 30000, spend: 22600, impressions: 410000, clicks: 38900, platformConversions: 2240, measuredConversions: 2018, revenue: 262300, newCustomers: 806 }),
  c({ id: "CMP-1033", name: "Linen Restock Flow", channel: "Email", platform: "Klaviyo", status: "Live", objective: "Repeat purchase", owner: "Mina Okafor", start: "2026-08-10", end: "2026-12-31", budget: 2500, spend: 1900, impressions: 182000, clicks: 14600, platformConversions: 1034, measuredConversions: 962, revenue: 118900, newCustomers: 41, cogsRate: 0.4 }),
  c({ id: "CMP-1052", name: "Holiday Gifting Preview", channel: "Paid Social", platform: "Meta Ads", status: "Scheduled", objective: "Purchases", owner: "Ana Ribeiro", start: "2026-11-04", end: "2026-12-20", budget: 82000, spend: 0, impressions: 0, clicks: 0, platformConversions: 0, measuredConversions: 0, revenue: 0, newCustomers: 0 }),
  c({ id: "CMP-1029", name: "Non-brand: Ceramic Cookware", channel: "Paid Search", platform: "Google Ads", status: "Live", objective: "Purchases", owner: "Dev Malhotra", start: "2026-07-27", end: "2026-12-31", budget: 40000, spend: 31400, impressions: 1280000, clicks: 24100, platformConversions: 690, measuredConversions: 541, revenue: 63800, newCustomers: 402, cogsRate: 0.46 }),
  c({ id: "CMP-1018", name: "Creator Collective", channel: "Affiliate", platform: "Impact (affiliate)", status: "Live", objective: "Purchases", owner: "Lior Ben-David", start: "2026-06-15", end: "2026-12-31", budget: 18000, spend: 12800, impressions: 940000, clicks: 18300, platformConversions: 488, measuredConversions: 377, revenue: 46100, newCustomers: 289 }),
  c({ id: "CMP-1036", name: "Win-back: 180-day Lapsed", channel: "Email", platform: "Klaviyo", status: "Paused", objective: "Reactivation", owner: "Mina Okafor", start: "2026-08-20", end: "2026-10-01", budget: 1000, spend: 600, impressions: 64000, clicks: 3100, platformConversions: 176, measuredConversions: 158, revenue: 17200, newCustomers: 0, cogsRate: 0.4 }),
  c({ id: "CMP-1047", name: "Prospecting — Video Stories", channel: "Paid Social", platform: "Meta Ads", status: "Learning", objective: "Purchases", owner: "Ana Ribeiro", start: "2026-09-28", end: "2026-11-30", budget: 24000, spend: 9800, impressions: 2310000, clicks: 16900, platformConversions: 212, measuredConversions: 131, revenue: 14900, newCustomers: 118 }),
];

export const liveCampaigns = campaigns.filter((x) => x.spend > 0);

/* --------------------------------------------------------- Daily series */
export type DailyPoint = { date: string; label: string; spend: number; revenue: number; sessions: number; orders: number; forecast?: boolean };

function buildDaily(): DailyPoint[] {
  const rand = mulberry32(42);
  const out: DailyPoint[] = [];
  const start = new Date(Date.UTC(2026, 6, 27));
  const totalSpend = liveCampaigns.reduce((a, x) => a + x.spend, 0);
  const totalRevenue = 1_012_600; // includes organic & unattributed orders
  for (let i = 0; i < 90; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const weekday = d.getUTCDay();
    const weekly = weekday === 0 || weekday === 6 ? 1.14 : weekday === 1 ? 0.92 : 1;
    const trend = 0.78 + (i / 89) * 0.44; // ramps into Q4
    const noise = 0.9 + rand() * 0.2;
    const s = (totalSpend / 90) * trend * (0.95 + rand() * 0.1);
    const r = (totalRevenue / 90) * trend * weekly * noise;
    out.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      spend: Math.round(s),
      revenue: Math.round(r),
      sessions: Math.round(4588 * trend * weekly * noise),
      orders: Math.round((r / 150.8) * 1),
    });
  }
  return out;
}
export const daily = buildDaily();

/** Naive seasonal forecast: last-28-day mean × trailing growth, flagged as forecast. */
export const forecast: DailyPoint[] = (() => {
  const last = daily.slice(-28);
  const prev = daily.slice(-56, -28);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const growth = mean(last.map((d) => d.revenue)) / mean(prev.map((d) => d.revenue));
  const weeklyGrowth = Math.pow(growth, 1 / 4);
  const base = mean(last.map((d) => d.revenue));
  const start = new Date(Date.UTC(2026, 9, 25));
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(start.getTime() + i * 86400000);
    const rev = base * Math.pow(weeklyGrowth, (i + 1) / 7);
    return {
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      spend: 0,
      revenue: Math.round(rev),
      sessions: 0,
      orders: 0,
      forecast: true,
    };
  });
})();

export const weekly = (() => {
  const weeks: { week: string; spend: number; revenue: number; orders: number; sessions: number }[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    weeks.push({
      week: chunk[0].label,
      spend: chunk.reduce((a, d) => a + d.spend, 0),
      revenue: chunk.reduce((a, d) => a + d.revenue, 0),
      orders: chunk.reduce((a, d) => a + d.orders, 0),
      sessions: chunk.reduce((a, d) => a + d.sessions, 0),
    });
  }
  return weeks;
})();

/* ------------------------------------------------------- Channel totals */
export const channelTotals = CHANNELS.map((ch) => {
  const rows = liveCampaigns.filter((x) => x.channel === ch);
  const organic: Record<string, { revenue: number; orders: number; sessions: number }> = {
    "Organic Search": { revenue: 189400, orders: 1268, sessions: 121400 },
    "Organic Social": { revenue: 88600, orders: 641, sessions: 48200 },
  };
  const o = organic[ch];
  return {
    channel: ch,
    spend: rows.reduce((a, x) => a + x.spend, 0),
    impressions: rows.reduce((a, x) => a + x.impressions, 0),
    clicks: rows.reduce((a, x) => a + x.clicks, 0),
    platformConversions: rows.reduce((a, x) => a + x.platformConversions, 0),
    measuredConversions: rows.reduce((a, x) => a + x.measuredConversions, 0) + (o?.orders ?? 0),
    revenue: rows.reduce((a, x) => a + x.revenue, 0) + (o?.revenue ?? 0),
    paid: rows.length > 0,
  };
});

export const scenarioBaselines: ChannelBaseline[] = [
  { channel: "Paid Search", spend: 54000, revenue: 326100, saturation: 70000 },
  { channel: "Paid Social", spend: 58000, revenue: 226300, saturation: 52000 },
  { channel: "Email", spend: 2500, revenue: 136100, saturation: 5000 },
  { channel: "Affiliate", spend: 12800, revenue: 46100, saturation: 22000 },
];

/* ---------------------------------------------------------------- Funnel */
export const funnel = [
  { stage: "Sessions", value: 412880, source: "GA4 export (synthetic)" },
  { stage: "Product views", value: 198400, source: "GA4 export (synthetic)" },
  { stage: "Add to cart", value: 41260, source: "Shopify events (synthetic)" },
  { stage: "Checkout started", value: 19870, source: "Shopify events (synthetic)" },
  { stage: "Purchase", value: 6714, source: "Shopify orders (synthetic)" },
];

/* ------------------------------------------------------ Conversion paths */
export const conversionPaths: ConversionPath[] = (() => {
  const rand = mulberry32(7);
  const pick = <T,>(xs: readonly T[], ws: number[]) => {
    const t = ws.reduce((a, b) => a + b, 0);
    let r = rand() * t;
    for (let i = 0; i < xs.length; i++) {
      r -= ws[i];
      if (r <= 0) return xs[i];
    }
    return xs[xs.length - 1];
  };
  const firstW = [18, 34, 6, 22, 10, 10];
  const midW = [20, 20, 26, 16, 8, 10];
  const lastW = [34, 16, 28, 12, 6, 4];
  return Array.from({ length: 640 }, (_, i) => {
    const len = pick([1, 2, 3, 4, 5], [22, 31, 25, 14, 8]);
    const touches = Array.from({ length: len }, (_, j) => {
      const w = j === 0 ? firstW : j === len - 1 ? lastW : midW;
      return { channel: pick(CHANNELS, w), daysBefore: Math.round(((len - 1 - j) / Math.max(1, len - 1)) * (2 + rand() * 18)) };
    });
    const revenue = Math.round(60 + rand() * 120 + (rand() > 0.85 ? rand() * 260 : 0));
    return { id: `PATH-${String(i + 1).padStart(4, "0")}`, touches, revenue };
  });
})();

/* -------------------------------------------------------------- Segments */
export type Segment = {
  id: string;
  name: string;
  description: string;
  rules: { field: string; op: string; value: string }[];
  size: number;
  growth: number;
  emailConsent: number;
  smsConsent: number;
  ltv: number;
  retention: number;
  aov: number;
  stage: string;
  health: "strong" | "steady" | "at-risk";
};

export const segments: Segment[] = [
  { id: "SEG-01", name: "Loyal Hosts", description: "Three or more orders in the last 365 days.", rules: [{ field: "orders_365d", op: "≥", value: "3" }, { field: "email_consent", op: "=", value: "true" }], size: 4820, growth: 0.046, emailConsent: 0.92, smsConsent: 0.41, ltv: 612, retention: 0.71, aov: 164, stage: "Loyal", health: "strong" },
  { id: "SEG-02", name: "New This Season", description: "First order placed in the last 60 days.", rules: [{ field: "first_order_at", op: "within", value: "60 days" }], size: 3140, growth: 0.128, emailConsent: 0.84, smsConsent: 0.22, ltv: 188, retention: 0.0, aov: 131, stage: "First purchase", health: "steady" },
  { id: "SEG-03", name: "Linen Enthusiasts", description: "Bought linen, or viewed linen PDPs 3+ times in 30 days.", rules: [{ field: "category_purchased", op: "contains", value: "Linen" }, { field: "pdp_views_linen_30d", op: "≥", value: "3" }], size: 7960, growth: 0.031, emailConsent: 0.79, smsConsent: 0.27, ltv: 344, retention: 0.52, aov: 148, stage: "Repeat", health: "steady" },
  { id: "SEG-04", name: "Lapsing (120–180d)", description: "Last order 120–180 days ago; no order since.", rules: [{ field: "days_since_order", op: "between", value: "120–180" }], size: 2410, growth: -0.062, emailConsent: 0.88, smsConsent: 0.3, ltv: 276, retention: 0.19, aov: 139, stage: "Lapsing", health: "at-risk" },
  { id: "SEG-05", name: "Gift Senders", description: "Shipping address differs from billing on any order.", rules: [{ field: "gift_order_count", op: "≥", value: "1" }], size: 1880, growth: 0.084, emailConsent: 0.81, smsConsent: 0.19, ltv: 301, retention: 0.44, aov: 176, stage: "Repeat", health: "strong" },
  { id: "SEG-06", name: "High-intent Browsers", description: "Cart started in 7 days with no purchase.", rules: [{ field: "cart_started_7d", op: "=", value: "true" }, { field: "purchased_7d", op: "=", value: "false" }], size: 5330, growth: 0.019, emailConsent: 0.58, smsConsent: 0.11, ltv: 0, retention: 0, aov: 0, stage: "Subscriber", health: "steady" },
];

export const lifecycle = [
  { stage: "Visitor", count: 118400 },
  { stage: "Subscriber", count: 31260 },
  { stage: "First purchase", count: 9480 },
  { stage: "Repeat", count: 6120 },
  { stage: "Loyal", count: 4820 },
  { stage: "Lapsing", count: 2410 },
  { stage: "Lapsed", count: 3970 },
];

export const privacyControls = [
  { label: "Consent-gated sends", detail: "Email/SMS steps skip profiles without channel consent.", on: true },
  { label: "Sensitive-attribute inference blocked", detail: "No modelling of health, ethnicity, religion, sexuality, politics or precise age.", on: true },
  { label: "Data retention", detail: "Behavioural events auto-expire after 25 months.", on: true },
  { label: "Suppression sync", detail: "Global opt-outs propagate to all connected channels.", on: true },
  { label: "Look-alike exports", detail: "Off — requires DPA review before enabling.", on: false },
];

/* --------------------------------------------------------------- Journey */
export type JourneyNode = {
  id: string;
  kind: "trigger" | "check" | "wait" | "branch" | "email" | "sms" | "ad" | "goal" | "exit";
  title: string;
  detail: string;
  x: number;
  y: number;
  entered: number;
  converted?: number;
};
export const journey = {
  name: "Abandoned cart recovery — consent-aware",
  status: "Draft · awaiting approval",
  nodes: [
    { id: "n1", kind: "trigger", title: "Cart started", detail: "No purchase within 4 hours", x: 0, y: 1, entered: 5330 },
    { id: "n2", kind: "check", title: "Consent check", detail: "Email consent = true", x: 1, y: 1, entered: 5330 },
    { id: "n3", kind: "email", title: "Email · Your cart is waiting", detail: "Dynamic cart block, no discount", x: 2, y: 1, entered: 3091, converted: 268 },
    { id: "n4", kind: "wait", title: "Wait 24 hours", detail: "Exit on purchase", x: 3, y: 1, entered: 2823 },
    { id: "n5", kind: "branch", title: "Opened email 1?", detail: "Split by engagement", x: 4, y: 1, entered: 2823 },
    { id: "n6", kind: "email", title: "Email · Styled for you", detail: "Lookbook + reviews block", x: 5, y: 0, entered: 1270, converted: 121 },
    { id: "n7", kind: "sms", title: "SMS · Gentle reminder", detail: "SMS-consented only (11%)", x: 5, y: 2, entered: 311, converted: 22 },
    { id: "n8", kind: "goal", title: "Goal · Purchase", detail: "Measured in Shopify orders", x: 6, y: 1, entered: 411 },
    { id: "n9", kind: "exit", title: "Exit · No consent", detail: "Suppressed from messaging", x: 2, y: 2, entered: 2239 },
  ] as JourneyNode[],
  edges: [
    ["n1", "n2"], ["n2", "n3"], ["n2", "n9"], ["n3", "n4"], ["n4", "n5"], ["n5", "n6"], ["n5", "n7"], ["n6", "n8"], ["n7", "n8"], ["n3", "n8"],
  ] as [string, string][],
};

/* ------------------------------------------------------- Recommendations */
export type Recommendation = {
  id: string;
  title: string;
  kind: "Budget" | "Experiment" | "Data quality" | "Creative" | "Lifecycle";
  summary: string;
  evidence: { text: string; ref: string }[];
  assumptions: string[];
  impact: string;
  confidence: "High" | "Medium" | "Low";
  requiresApproval: boolean;
  status: "New" | "Under review" | "Approved" | "Dismissed";
};

export const recommendations: Recommendation[] = [
  {
    id: "REC-201",
    title: "Move 15% of Video Stories budget into Autumn Hearth",
    kind: "Budget",
    summary: "Measured ROAS is materially higher on Autumn Hearth; Video Stories remains in learning with low measured conversions.",
    evidence: [
      { text: "Autumn Hearth measured ROAS 4.39× on $48.2k spend", ref: "CMP-1041" },
      { text: "Video Stories measured ROAS 1.52× on $9.8k spend (learning)", ref: "CMP-1047" },
    ],
    assumptions: ["Response curves: saturation $52k/90d (Autumn Hearth) and $12k/90d (Video Stories) — analyst assumptions.", "Learning-phase results are directionally indicative only."],
    impact: "+$1.7k to +$2.7k revenue per 90 days (scenario band, saturation ±30%; not guaranteed)",
    confidence: "Medium",
    requiresApproval: true,
    status: "New",
  },
  {
    id: "REC-202",
    title: "Reconcile Meta-reported conversions before scaling",
    kind: "Data quality",
    summary: "Meta reports 28.7% more conversions than matched Shopify orders for Autumn Hearth. Budget decisions use measured orders.",
    evidence: [
      { text: "Platform-reported 1,912 vs measured 1,486 conversions", ref: "CMP-1041" },
      { text: "Gap on Video Stories: 212 vs 131 (61.8% over)", ref: "CMP-1047" },
    ],
    assumptions: ["View-through and modelled conversions explain most of the gap; not verified."],
    impact: "Prevents over-allocation driven by over-reported conversions",
    confidence: "High",
    requiresApproval: false,
    status: "Under review",
  },
  {
    id: "REC-203",
    title: "A/B test a benefit-led subject line on Linen Restock",
    kind: "Experiment",
    summary: "Click rate on the restock flow declined over the last four weeks; a subject-line test is low cost and reversible.",
    evidence: [{ text: "Linen Restock flow: 14,600 clicks on 182,000 deliveries (8.0%)", ref: "CMP-1033" }],
    assumptions: ["Baseline click rate 8.0%; detecting a +1.0pt change needs ~12,200 deliveries per arm (α 0.05, power 0.8)."],
    impact: "Learning outcome; revenue impact unknown until test completes",
    confidence: "Medium",
    requiresApproval: true,
    status: "New",
  },
  {
    id: "REC-204",
    title: "Tighten Ceramic Cookware non-brand keywords",
    kind: "Budget",
    summary: "Measured CPA is the highest of all live search campaigns and profit after COGS and media is thin.",
    evidence: [{ text: "CPA $58.04 vs $11.20 on Brand Search; profit after COGS and spend $3.05k on $31.4k", ref: "CMP-1029" }],
    assumptions: ["Search-term report not yet connected; keyword-level waste is inferred, not observed."],
    impact: "Reduce spend at risk ~$6k/month; revenue effect uncertain",
    confidence: "Low",
    requiresApproval: true,
    status: "New",
  },
  {
    id: "REC-205",
    title: "Resume win-back for the Lapsing segment with a consent-aware journey",
    kind: "Lifecycle",
    summary: "2,410 lapsing customers (88% email-consented). The paused win-back flow previously converted 5.1% of clicks.",
    evidence: [
      { text: "SEG-04 size 2,410, −6.2% month over month", ref: "SEG-04" },
      { text: "Win-back flow: 158 measured orders from 3,100 clicks", ref: "CMP-1036" },
    ],
    assumptions: ["Historical conversion rate will hold for a new cohort."],
    impact: "Directional: ~5 orders per send (2,121 consented × 4.8% click rate × 5.1% conversion)",
    confidence: "Medium",
    requiresApproval: true,
    status: "New",
  },
];

/* ------------------------------------------------------------ Experiments */
export const experiments = [
  { id: "EXP-31", name: "PDP hero: lifestyle vs product shot", metric: "Add-to-cart rate", status: "Completed", a: { visitors: 18240, conversions: 612 }, b: { visitors: 18105, conversions: 701 }, days: 21 },
  { id: "EXP-32", name: "Email subject: curiosity vs benefit", metric: "Click rate", status: "Completed", a: { visitors: 24000, conversions: 1330 }, b: { visitors: 24100, conversions: 1372 }, days: 14 },
  { id: "EXP-33", name: "Free-shipping threshold $75 vs $95", metric: "Purchase rate", status: "Running", a: { visitors: 6210, conversions: 214 }, b: { visitors: 6188, conversions: 236 }, days: 6 },
];

/* ---------------------------------------------------------- Intelligence */
export type Finding = {
  id: string;
  area: "Search demand" | "Competitors" | "Customer pain points" | "Content gaps" | "Channel opportunity" | "Market trend";
  claim: string;
  basis: "Evidence" | "Assumption" | "Recommendation";
  source: string;
  detail: string;
};

export const findings: Finding[] = [
  { id: "F-01", area: "Search demand", basis: "Evidence", claim: "“linen duvet cover” queries drive the largest share of non-brand organic clicks.", source: "Uploaded Search Console export · Oct 2026 (synthetic)", detail: "3,412 clicks / 96,200 impressions in 28 days; avg position 6.8." },
  { id: "F-02", area: "Customer pain points", basis: "Evidence", claim: "Sizing confusion is the most cited pre-purchase concern for bedding.", source: "Uploaded review corpus · 1,284 reviews (synthetic)", detail: "212 reviews mention fit or sizing; 61% of those are 3 stars or below." },
  { id: "F-03", area: "Competitors", basis: "Evidence", claim: "Two of three tracked competitors lead with sustainability certification on their homepages.", source: "Public website review · Oct 12, 2026 (synthetic)", detail: "Harbor Home and Fable & Fern display OEKO-TEX claims above the fold; Kiln Goods leads on price." },
  { id: "F-04", area: "Content gaps", basis: "Assumption", claim: "A linen care guide could capture informational demand we currently cede.", source: "Analyst assumption — no keyword-volume provider connected", detail: "Competitors rank for care-guide content; our site has no equivalent page. Volume not verified." },
  { id: "F-05", area: "Channel opportunity", basis: "Recommendation", claim: "Test Pinterest for home-decor discovery before Q1 planning.", source: "Strategist recommendation — derived from F-03 and audience overlap notes", detail: "No Pinterest data connected; treat as hypothesis to validate with a capped test budget." },
  { id: "F-06", area: "Market trend", basis: "Evidence", claim: "Gift-sender orders rose ahead of the holiday window.", source: "Shopify orders (synthetic) · SEG-05", detail: "Gift Senders segment +8.4% month over month; AOV $176 vs $151 store average." },
  { id: "F-07", area: "Search demand", basis: "Assumption", claim: "Brand search demand will rise in November with paid social scale-up.", source: "Analyst assumption based on 2025 seasonal pattern (synthetic history)", detail: "Not a forecast — no external demand data connected." },
];

export const searchQueries = [
  { query: "linen duvet cover", clicks: 3412, impressions: 96200, position: 6.8, intent: "Commercial" },
  { query: "lumen and oak", clicks: 2980, impressions: 7400, position: 1.1, intent: "Navigational" },
  { query: "stoneware dinner set", clicks: 1206, impressions: 51800, position: 9.4, intent: "Commercial" },
  { query: "how to wash linen sheets", clicks: 188, impressions: 40100, position: 18.2, intent: "Informational" },
  { query: "oak serving board", clicks: 742, impressions: 22600, position: 7.9, intent: "Commercial" },
  { query: "best linen sheets for hot sleepers", clicks: 311, impressions: 28900, position: 12.6, intent: "Commercial" },
];

export const competitors = [
  { name: "Harbor Home", positioning: "Certified sustainable basics", priceIndex: 1.08, heroClaim: "OEKO-TEX certified linen", channels: ["Search", "Social", "Email"], shareOfVoice: null as number | null },
  { name: "Fable & Fern", positioning: "Design-led heirloom pieces", priceIndex: 1.31, heroClaim: "Made to be handed down", channels: ["Social", "Creators", "Retail"], shareOfVoice: null },
  { name: "Kiln Goods", positioning: "Value ceramics and linen", priceIndex: 0.82, heroClaim: "Everyday prices, every day", channels: ["Search", "Marketplace"], shareOfVoice: null },
];

/* ------------------------------------------------------------- Creative */
export type Asset = {
  id: string;
  title: string;
  type: "Email" | "Paid social ad" | "Landing page" | "Social post" | "Video script" | "Creative brief";
  campaign: string;
  status: "Draft" | "In review" | "Changes requested" | "Approved";
  version: number;
  owner: string;
  brandScore: number;
  headline: string;
  body: string;
  checks: { label: string; state: "pass" | "warn" | "fail"; note: string }[];
  art: number;
  updated: string;
};

export const assets: Asset[] = [
  {
    id: "AST-501", title: "Autumn Hearth — hero carousel", type: "Paid social ad", campaign: "CMP-1041", status: "In review", version: 4, owner: "Ana Ribeiro", brandScore: 92, art: 0, updated: "2h ago",
    headline: "Slow evenings, softer linen.",
    body: "Stonewashed linen in four autumn tones, made to get better with every wash. Free returns within 60 days.",
    checks: [
      { label: "Brand voice", state: "pass", note: "Calm, sensory, no exclamation marks." },
      { label: "Claims", state: "pass", note: "“Free returns within 60 days” matches policy doc v3." },
      { label: "Accessibility", state: "warn", note: "Frame 3 text contrast 3.8:1 — below 4.5:1." },
    ],
  },
  {
    id: "AST-502", title: "Linen Restock — email 1", type: "Email", campaign: "CMP-1033", status: "Approved", version: 7, owner: "Mina Okafor", brandScore: 95, art: 1, updated: "Yesterday",
    headline: "Back in Oat and Clay.",
    body: "The colours you asked for are back. Reserve yours before the season’s run sells through.",
    checks: [
      { label: "Brand voice", state: "pass", note: "On-tone." },
      { label: "Claims", state: "pass", note: "Restock dates verified against inventory feed (synthetic)." },
      { label: "Consent", state: "pass", note: "Audience filtered to email-consented profiles." },
    ],
  },
  {
    id: "AST-503", title: "Cookware — search landing page", type: "Landing page", campaign: "CMP-1029", status: "Changes requested", version: 2, owner: "Dev Malhotra", brandScore: 71, art: 2, updated: "3h ago",
    headline: "The best-selling stoneware in America.",
    body: "Oven-to-table stoneware that chefs swear by. Durable, beautiful and dishwasher safe.",
    checks: [
      { label: "Claims", state: "fail", note: "“Best-selling in America” — no supporting source on file. Remove or substantiate." },
      { label: "Claims", state: "fail", note: "“Chefs swear by” implies endorsements; no testimonials on record." },
      { label: "Brand voice", state: "warn", note: "Superlatives conflict with brand guideline §2.1." },
    ],
  },
  {
    id: "AST-504", title: "Gifting preview — 15s vertical script", type: "Video script", campaign: "CMP-1052", status: "Draft", version: 1, owner: "Ana Ribeiro", brandScore: 88, art: 3, updated: "20m ago",
    headline: "Gifts that stay out on the table.",
    body: "0–3s: hands wrapping an oak board in linen. 3–9s: table set for six, candlelight. 9–15s: “Gifts that stay out.” End card with shipping cut-off date.",
    checks: [
      { label: "Brand voice", state: "pass", note: "Matches seasonal tone guide." },
      { label: "Claims", state: "warn", note: "Shipping cut-off date must be confirmed by ops before launch." },
    ],
  },
  {
    id: "AST-505", title: "Win-back — social post set", type: "Social post", campaign: "CMP-1036", status: "Draft", version: 2, owner: "Mina Okafor", brandScore: 84, art: 4, updated: "4d ago",
    headline: "It’s been a while. Here’s what’s new.",
    body: "New autumn tones, a reworked waffle towel and a care guide written with our weavers.",
    checks: [{ label: "Brand voice", state: "pass", note: "On-tone." }],
  },
  {
    id: "AST-506", title: "Holiday 2026 — creative brief", type: "Creative brief", campaign: "CMP-1052", status: "In review", version: 3, owner: "Ana Ribeiro", brandScore: 90, art: 5, updated: "1d ago",
    headline: "Objective: gift-led acquisition at ≤ $42 measured CAC",
    body: "Audience: Gift Senders look-in (owned data only), Loyal Hosts referral. Mandatories: shipping cut-off, returns policy. Avoid: discount-led framing.",
    checks: [{ label: "Claims", state: "pass", note: "No product claims in brief." }],
  },
];

export const brandVoice = {
  name: "Lumen & Oak voice v3",
  traits: [
    { trait: "Calm", weight: 0.9 },
    { trait: "Sensory", weight: 0.8 },
    { trait: "Plainspoken", weight: 0.75 },
    { trait: "Warm", weight: 0.7 },
    { trait: "Playful", weight: 0.2 },
  ],
  avoid: ["Superlatives without proof", "Urgency countdowns", "Exclamation marks", "Discount-first framing"],
  approvedClaims: ["Free returns within 60 days", "Stonewashed European flax linen", "Dishwasher-safe stoneware"],
};

export const contentCalendar = [
  { day: "Mon 27", items: [{ t: "Email · Restock reminder", ch: "Email" }] },
  { day: "Tue 28", items: [{ t: "IG · Autumn tones carousel", ch: "Organic Social" }, { t: "Meta · Hearth refresh v5", ch: "Paid Social" }] },
  { day: "Wed 29", items: [{ t: "Blog · Linen care guide", ch: "Organic Search" }] },
  { day: "Thu 30", items: [{ t: "Creator drop · Table settings", ch: "Affiliate" }] },
  { day: "Fri 31", items: [{ t: "Email · Weekend edit", ch: "Email" }, { t: "IG · Behind the loom", ch: "Organic Social" }] },
  { day: "Sat 1", items: [] },
  { day: "Sun 2", items: [{ t: "Pinterest test (proposed)", ch: "Paid Social" }] },
];

/* -------------------------------------------------- Campaign plan draft */
export const campaignDraft = {
  name: "Holiday Gifting 2026",
  objective: "Gift-led new-customer acquisition",
  budget: 82000,
  dates: "Nov 4 – Dec 20, 2026",
  kpis: [
    { kpi: "Measured CAC", target: "≤ $42", basis: "Q3 blended CAC $43.10 (CMP-1041, CMP-1029)" },
    { kpi: "Measured ROAS", target: "≥ 3.2×", basis: "Assumption — prior holiday ROAS not in workspace" },
    { kpi: "New customers", target: "1,950", basis: "Budget ÷ target CAC" },
  ],
  channelMix: [
    { channel: "Paid Social", share: 0.5 },
    { channel: "Paid Search", share: 0.28 },
    { channel: "Email", share: 0.04 },
    { channel: "Affiliate", share: 0.18 },
  ],
  messaging: [
    { level: "Core promise", text: "Gifts that stay out on the table." },
    { level: "Proof", text: "Stonewashed European flax linen · free returns within 60 days" },
    { level: "Audience angle — Gift Senders", text: "Wrapped, shipped and dated so it arrives on time." },
    { level: "Audience angle — Loyal Hosts", text: "Set the table you’ll be remembered for." },
  ],
  checklist: [
    { item: "Brand guideline v3 attached", done: true },
    { item: "Claims sheet approved by legal", done: true },
    { item: "Shipping cut-off confirmed by ops", done: false },
    { item: "Measurement plan: holdout region agreed", done: false },
    { item: "Budget approval (Finance)", done: false },
    { item: "Creative v1 reviewed", done: true },
  ],
};

/* --------------------------------------------------------- Integrations */
export type Integration = {
  name: string;
  category: "Advertising" | "Analytics" | "CRM" | "Commerce" | "Email & SMS" | "SEO" | "Collaboration";
  status: "Demo fixture" | "Not connected" | "Error";
  scopes: string;
  note: string;
};
export const integrations: Integration[] = [
  { name: "Google Ads", category: "Advertising", status: "Demo fixture", scopes: "Read campaigns, metrics", note: "Synthetic fixture stands in for the API. OAuth not configured." },
  { name: "Meta Ads", category: "Advertising", status: "Demo fixture", scopes: "ads_read", note: "Synthetic fixture. Marketing API app review required for production." },
  { name: "Google Analytics 4", category: "Analytics", status: "Demo fixture", scopes: "analytics.readonly", note: "Synthetic export used for funnel views." },
  { name: "Search Console", category: "SEO", status: "Demo fixture", scopes: "webmasters.readonly", note: "Synthetic export uploaded as CSV." },
  { name: "Shopify", category: "Commerce", status: "Demo fixture", scopes: "read_orders, read_customers", note: "Measured orders come from this synthetic fixture." },
  { name: "Klaviyo", category: "Email & SMS", status: "Demo fixture", scopes: "Read flows, campaigns", note: "Synthetic fixture. Send permissions intentionally not requested." },
  { name: "HubSpot CRM", category: "CRM", status: "Not connected", scopes: "—", note: "Planned adapter." },
  { name: "Salesforce", category: "CRM", status: "Not connected", scopes: "—", note: "Planned adapter." },
  { name: "LinkedIn Ads", category: "Advertising", status: "Error", scopes: "r_ads_reporting", note: "Example error state: token expired — reconnect required." },
  { name: "Semrush", category: "SEO", status: "Not connected", scopes: "—", note: "Paid API — requires your approval and cost review." },
  { name: "Slack", category: "Collaboration", status: "Not connected", scopes: "—", note: "Approval notifications." },
];

/* ------------------------------------------------------- Team & audit */
export const team = [
  { name: "Priya Natarajan", email: "priya@halcyon.example", role: "Owner", lastActive: "Now" },
  { name: "Ana Ribeiro", email: "ana@halcyon.example", role: "Strategist", lastActive: "12m ago" },
  { name: "Dev Malhotra", email: "dev@halcyon.example", role: "Media buyer", lastActive: "1h ago" },
  { name: "Mina Okafor", email: "mina@halcyon.example", role: "Lifecycle lead", lastActive: "3h ago" },
  { name: "Lior Ben-David", email: "lior@halcyon.example", role: "Analyst", lastActive: "Yesterday" },
  { name: "Client: Sam Whitford", email: "sam@lumenoak.example", role: "Client viewer", lastActive: "2d ago" },
];

export const roles = [
  { role: "Owner", perms: ["Billing", "Members", "Integrations", "Approve spend", "Publish", "Edit", "View"] },
  { role: "Strategist", perms: ["Approve creative", "Edit", "View"] },
  { role: "Media buyer", perms: ["Request spend changes", "Edit", "View"] },
  { role: "Analyst", perms: ["Edit reports", "View"] },
  { role: "Client viewer", perms: ["View approved reports"] },
];

export const auditLog = [
  { at: "10:42", actor: "Ana Ribeiro", action: "Requested approval", target: "AST-501 v4", kind: "approval" },
  { at: "10:18", actor: "Copilot", action: "Drafted recommendation", target: "REC-201", kind: "ai" },
  { at: "09:57", actor: "Dev Malhotra", action: "Edited budget (draft)", target: "CMP-1029", kind: "edit" },
  { at: "09:30", actor: "System", action: "Sync failed — token expired", target: "LinkedIn Ads", kind: "error" },
  { at: "08:12", actor: "Priya Natarajan", action: "Invited member", target: "lior@halcyon.example", kind: "member" },
  { at: "Yesterday", actor: "Mina Okafor", action: "Approved", target: "AST-502 v7", kind: "approval" },
];

export const agentActivity = [
  { agent: "Research agent", task: "Summarising uploaded review corpus", status: "running", progress: 0.64, needsApproval: false },
  { agent: "Creative agent", task: "Drafting 3 headline variants for AST-504", status: "waiting", progress: 1, needsApproval: true },
  { agent: "Analyst agent", task: "Reconciling Meta vs Shopify conversions", status: "done", progress: 1, needsApproval: false },
  { agent: "Ops agent", task: "Preparing Holiday Gifting launch checklist", status: "queued", progress: 0, needsApproval: false },
];

export const reports = [
  { id: "RPT-88", title: "October performance — Lumen & Oak", type: "Campaign performance", period: "Oct 1 – Oct 24", status: "Draft", pages: 12 },
  { id: "RPT-87", title: "Q3 marketing ROI", type: "Marketing ROI", period: "Jul – Sep 2026", status: "Shared with client", pages: 18 },
  { id: "RPT-86", title: "Channel comparison — paid vs owned", type: "Channel comparison", period: "Last 90 days", status: "Approved", pages: 8 },
  { id: "RPT-85", title: "PDP hero test readout", type: "Experiment results", period: "Sep 2026", status: "Approved", pages: 4 },
  { id: "RPT-84", title: "Executive brief — week 43", type: "Executive brief", period: "Oct 19 – 24", status: "Scheduled", pages: 2 },
];
