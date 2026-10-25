/**
 * Rule-based multi-touch attribution over independently measured conversion
 * paths. Each conversion distributes exactly 1.0 of credit, so totals always
 * reconcile to measured conversions — no double counting across channels.
 *
 * These are allocation rules, not causal estimates. Incrementality requires
 * experiments (geo or holdout) and is reported separately.
 */

export type Touch = { channel: string; daysBefore: number };
export type ConversionPath = { id: string; touches: Touch[]; revenue: number };

export type AttributionModel = "first_touch" | "last_touch" | "linear" | "time_decay" | "position_based";

export const MODEL_LABELS: Record<AttributionModel, string> = {
  first_touch: "First touch",
  last_touch: "Last touch",
  linear: "Linear",
  time_decay: "Time decay (7-day half-life)",
  position_based: "Position-based (40/20/40)",
};

export const MODEL_DESCRIPTIONS: Record<AttributionModel, string> = {
  first_touch: "100% of credit to the first recorded touch.",
  last_touch: "100% of credit to the final touch before conversion.",
  linear: "Credit split equally across every touch in the path.",
  time_decay: "Touches closer to conversion earn more; weight halves every 7 days.",
  position_based: "40% first, 40% last, remaining 20% split across middle touches.",
};

export function touchWeights(touches: Touch[], model: AttributionModel, halfLifeDays = 7): number[] {
  const n = touches.length;
  if (n === 0) return [];
  if (n === 1) return [1];
  switch (model) {
    case "first_touch":
      return touches.map((_, i) => (i === 0 ? 1 : 0));
    case "last_touch":
      return touches.map((_, i) => (i === n - 1 ? 1 : 0));
    case "linear":
      return touches.map(() => 1 / n);
    case "time_decay": {
      const raw = touches.map((t) => Math.pow(2, -t.daysBefore / halfLifeDays));
      const total = raw.reduce((a, b) => a + b, 0);
      return raw.map((w) => w / total);
    }
    case "position_based": {
      if (n === 2) return [0.5, 0.5];
      const middle = 0.2 / (n - 2);
      return touches.map((_, i) => (i === 0 || i === n - 1 ? 0.4 : middle));
    }
  }
}

export type ChannelCredit = { channel: string; conversions: number; revenue: number };

export function attribute(paths: ConversionPath[], model: AttributionModel): ChannelCredit[] {
  const acc = new Map<string, ChannelCredit>();
  for (const path of paths) {
    const weights = touchWeights(path.touches, model);
    path.touches.forEach((t, i) => {
      const row = acc.get(t.channel) ?? { channel: t.channel, conversions: 0, revenue: 0 };
      row.conversions += weights[i];
      row.revenue += weights[i] * path.revenue;
      acc.set(t.channel, row);
    });
  }
  return [...acc.values()].sort((a, b) => b.revenue - a.revenue);
}

/** Reconciliation: attributed totals must equal measured totals (within float tolerance). */
export function reconcile(paths: ConversionPath[], credits: ChannelCredit[]) {
  const measuredConversions = paths.length;
  const measuredRevenue = paths.reduce((a, p) => a + p.revenue, 0);
  const attributedConversions = credits.reduce((a, c) => a + c.conversions, 0);
  const attributedRevenue = credits.reduce((a, c) => a + c.revenue, 0);
  return {
    measuredConversions,
    measuredRevenue,
    attributedConversions,
    attributedRevenue,
    balanced:
      Math.abs(measuredConversions - attributedConversions) < 1e-6 &&
      Math.abs(measuredRevenue - attributedRevenue) < 1e-4,
  };
}
