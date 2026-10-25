/**
 * Experiment statistics: two-proportion comparison with a normal-approximation
 * (Wald) confidence interval for the absolute difference and a pooled z-test.
 */

/** Standard normal CDF via Abramowitz–Stegun 7.1.26 erf approximation (|error| < 1.5e-7). */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

export type VariantCounts = { visitors: number; conversions: number };

export type ExperimentResult = {
  rateA: number;
  rateB: number;
  absoluteLift: number;
  relativeLift: number | null;
  ciLow: number;
  ciHigh: number;
  z: number;
  pValue: number;
  significant: boolean;
  verdict: "B leads" | "A leads" | "Inconclusive";
};

export function compareProportions(a: VariantCounts, b: VariantCounts, z95 = 1.959964): ExperimentResult {
  const rateA = a.conversions / a.visitors;
  const rateB = b.conversions / b.visitors;
  const diff = rateB - rateA;
  const seUnpooled = Math.sqrt((rateA * (1 - rateA)) / a.visitors + (rateB * (1 - rateB)) / b.visitors);
  const pooled = (a.conversions + b.conversions) / (a.visitors + b.visitors);
  const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / a.visitors + 1 / b.visitors));
  const z = sePooled === 0 ? 0 : diff / sePooled;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  const significant = pValue < 0.05;
  return {
    rateA,
    rateB,
    absoluteLift: diff,
    relativeLift: rateA === 0 ? null : diff / rateA,
    ciLow: diff - z95 * seUnpooled,
    ciHigh: diff + z95 * seUnpooled,
    z,
    pValue,
    significant,
    verdict: !significant ? "Inconclusive" : diff > 0 ? "B leads" : "A leads",
  };
}

/** Visitors needed per arm to detect `mde` (absolute) at α=0.05, power=0.8. */
export function sampleSizePerArm(baseline: number, mde: number) {
  const zAlpha = 1.959964;
  const zBeta = 0.841621;
  const p2 = baseline + mde;
  const pBar = (baseline + p2) / 2;
  const n =
    Math.pow(zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(baseline * (1 - baseline) + p2 * (1 - p2)), 2) /
    Math.pow(mde, 2);
  return Math.ceil(n);
}
