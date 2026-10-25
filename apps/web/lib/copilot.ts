/**
 * Preview copilot: a deterministic intent router over the synthetic dataset.
 *
 * No LLM is connected in the preview. Each answer is computed from records
 * with the same metric functions the dashboards use, cites those records,
 * and keeps analysis separate from recommendation. In the full product an
 * LLM selects tools and phrases answers; the numbers still come from here.
 */
import { attribute } from "./attribution";
import { campaigns, channelTotals, conversionPaths, experiments, segments } from "./demo-data";
import { fmtCurrency, fmtPct, fmtRatio } from "./format";
import { cpa, roas } from "./metrics";
import { compareProportions } from "./stats";

export type CopilotAnswer = {
  question: string;
  analysis: string[];
  recommendation?: string;
  uncertainty: string;
  citations: string[];
  requiresApproval?: boolean;
};

export const SUGGESTED_QUESTIONS = [
  "Which channels have the strongest measured returns?",
  "Which campaigns generated the most conversions?",
  "Which audience segments are underperforming?",
  "What should we test next?",
  "Why might platform conversions differ from ours?",
];

export function askCopilot(q: string): CopilotAnswer {
  const s = q.toLowerCase();

  if (s.includes("channel") && (s.includes("return") || s.includes("roas"))) {
    const paid = channelTotals.filter((c) => c.paid);
    const credits = attribute(conversionPaths, "position_based");
    const ranked = paid
      .map((c) => ({ ...c, r: roas(c.revenue, c.spend) ?? 0 }))
      .sort((a, b) => b.r - a.r);
    return {
      question: q,
      analysis: [
        ...ranked.map((c) => `${c.channel}: ${fmtRatio(c.r)} measured ROAS on ${fmtCurrency(c.spend)} spend.`),
        `Under position-based attribution the top revenue channel is ${credits[0].channel}.`,
      ],
      recommendation: "Prioritise budget review on the lowest-ROAS paid channel; validate with a holdout test before reallocating.",
      uncertainty: "Measured ROAS uses matched first-party orders. It is an allocation, not proof of incrementality.",
      citations: ranked.flatMap((c) => campaigns.filter((x) => x.channel === c.channel && x.spend > 0).map((x) => x.id)),
    };
  }

  if (s.includes("campaign") && (s.includes("most") || s.includes("lead") || s.includes("conversion"))) {
    const top = [...campaigns].filter((c) => c.spend > 0).sort((a, b) => b.measuredConversions - a.measuredConversions).slice(0, 3);
    return {
      question: q,
      analysis: top.map(
        (c) => `${c.name} (${c.id}): ${c.measuredConversions.toLocaleString()} measured conversions at ${fmtCurrency(cpa(c.spend, c.measuredConversions), 2)} CPA.`,
      ),
      uncertainty: "Counts are measured orders; lead qualification data (CRM) is not connected in this workspace.",
      citations: top.map((c) => c.id),
    };
  }

  if (s.includes("segment") || s.includes("audience")) {
    const weak = segments.filter((x) => x.health === "at-risk" || x.growth < 0);
    return {
      question: q,
      analysis: weak.map((x) => `${x.name} (${x.id}): ${x.size.toLocaleString()} profiles, ${fmtPct(x.growth)} month over month, retention ${fmtPct(x.retention, 0)}.`),
      recommendation: "Resume a consent-aware win-back journey for the lapsing cohort (draft REC-205).",
      uncertainty: "Segment health uses observed order recency only; no predictive churn model is active.",
      citations: weak.map((x) => x.id).concat("REC-205"),
      requiresApproval: true,
    };
  }

  if (s.includes("test")) {
    const done = experiments.filter((e) => e.status === "Completed").map((e) => ({ e, r: compareProportions(e.a, e.b) }));
    return {
      question: q,
      analysis: done.map(({ e, r }) => `${e.name}: ${r.verdict} (Δ ${fmtPct(r.absoluteLift, 2)}, 95% CI ${fmtPct(r.ciLow, 2)} to ${fmtPct(r.ciHigh, 2)}, p=${r.pValue.toFixed(3)}).`),
      recommendation: "Next: benefit-led subject line on Linen Restock (REC-203) — ~12,200 deliveries per arm to detect +1.0pt.",
      uncertainty: "Sample-size estimate assumes an 8.0% baseline click rate holds during the test.",
      citations: done.map(({ e }) => e.id).concat("REC-203"),
      requiresApproval: true,
    };
  }

  if (s.includes("platform") || s.includes("differ") || s.includes("why")) {
    const rows = campaigns.filter((c) => c.platformConversions > 0);
    return {
      question: q,
      analysis: rows
        .slice(0, 4)
        .map((c) => `${c.name}: platform ${c.platformConversions.toLocaleString()} vs measured ${c.measuredConversions.toLocaleString()} (${fmtPct(c.platformConversions / c.measuredConversions - 1)} over).`),
      uncertainty: "Likely drivers are view-through windows and modelled conversions. This is a hypothesis; the cause is not verified.",
      citations: rows.slice(0, 4).map((c) => c.id),
    };
  }

  return {
    question: q,
    analysis: ["I can only answer from data connected to this workspace. I couldn’t map this question to an available dataset."],
    uncertainty: "No answer generated — avoiding unsupported numbers.",
    citations: [],
  };
}
