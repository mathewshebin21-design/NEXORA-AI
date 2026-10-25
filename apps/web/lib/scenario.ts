/**
 * Budget scenario modelling with explicit, inspectable assumptions.
 *
 * Response curve: revenue(spend) = scale × (1 − e^(−spend / saturation)).
 * `scale` is calibrated so the curve passes through the observed point
 * (current spend, current revenue) for the chosen saturation. This is a
 * planning heuristic, not a causal forecast — the UI must say so.
 */

export type ChannelBaseline = {
  channel: string;
  spend: number;
  revenue: number;
  /** Assumed spend at which ~63% of the channel's ceiling is reached. */
  saturation: number;
};

export function curveScale(b: ChannelBaseline) {
  const f = 1 - Math.exp(-b.spend / b.saturation);
  return f === 0 ? 0 : b.revenue / f;
}

export function projectedRevenue(b: ChannelBaseline, newSpend: number) {
  return curveScale(b) * (1 - Math.exp(-Math.max(0, newSpend) / b.saturation));
}

/** Marginal ROAS at a spend level: d(revenue)/d(spend). */
export function marginalRoas(b: ChannelBaseline, atSpend: number) {
  return (curveScale(b) / b.saturation) * Math.exp(-atSpend / b.saturation);
}

export type ScenarioRow = {
  channel: string;
  baseSpend: number;
  newSpend: number;
  baseRevenue: number;
  newRevenue: number;
  deltaRevenue: number;
  marginalRoas: number;
};

export function runScenario(baselines: ChannelBaseline[], multipliers: Record<string, number>): ScenarioRow[] {
  return baselines.map((b) => {
    const m = multipliers[b.channel] ?? 1;
    const newSpend = b.spend * m;
    const newRevenue = projectedRevenue(b, newSpend);
    return {
      channel: b.channel,
      baseSpend: b.spend,
      newSpend,
      baseRevenue: b.revenue,
      newRevenue,
      deltaRevenue: newRevenue - b.revenue,
      marginalRoas: marginalRoas(b, newSpend),
    };
  });
}

/** Low / high band from ±uncertainty on the saturation assumption. */
export function scenarioBand(baselines: ChannelBaseline[], multipliers: Record<string, number>, uncertainty = 0.3) {
  const total = (rows: ScenarioRow[]) => rows.reduce((a, r) => a + r.newRevenue, 0);
  const low = total(runScenario(baselines.map((b) => ({ ...b, saturation: b.saturation * (1 - uncertainty) })), multipliers));
  const high = total(runScenario(baselines.map((b) => ({ ...b, saturation: b.saturation * (1 + uncertainty) })), multipliers));
  const mid = total(runScenario(baselines, multipliers));
  return { low: Math.min(low, high), mid, high: Math.max(low, high) };
}
