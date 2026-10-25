/**
 * Deterministic analytics tests. Expected values are computed by hand
 * (shown in comments), not by calling the code under test.
 *
 *   node --experimental-strip-types --test tests/analytics.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { campaignProfit, cpa, cpc, cpm, ctr, conversionRate, lifetimeValue, retentionRate, roas, sumPerformance } from "../lib/metrics.ts";
import { attribute, reconcile, touchWeights, type ConversionPath } from "../lib/attribution.ts";
import { compareProportions, normalCdf, sampleSizePerArm } from "../lib/stats.ts";
import { marginalRoas, projectedRevenue, runScenario, scenarioBand } from "../lib/scenario.ts";

const close = (a: number | null, b: number, eps = 1e-4) => {
  assert.ok(a !== null, "expected a number, got null");
  assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
};

test("rate metrics match hand-computed values", () => {
  close(ctr(71_400, 6_120_000), 0.0116667); // 71,400 / 6,120,000
  close(cpc(48_200, 71_400), 0.675070); // 48,200 / 71,400
  close(cpm(48_200, 6_120_000), 7.875817); // 48,200 / 6,120,000 × 1000
  close(conversionRate(1_486, 71_400), 0.0208123);
  close(cpa(22_600, 2_018), 11.199207);
  close(roas(211_400, 48_200), 4.385892);
});

test("zero denominators return null, never 0 or Infinity", () => {
  assert.equal(ctr(10, 0), null);
  assert.equal(cpa(100, 0), null);
  assert.equal(roas(100, 0), null);
  assert.equal(cpm(100, 0), null);
});

test("profit, LTV and retention", () => {
  assert.equal(campaignProfit(63_800, 29_348, 31_400), 3_052); // 63,800 − 29,348 − 31,400
  close(lifetimeValue(150, 2, 0.6, 3), 540); // 150 × 2 × 0.6 × 3
  close(retentionRate(1_000, 1_100, 300), 0.8); // (1,100 − 300) / 1,000
});

test("sumPerformance aggregates raw inputs, not ratios", () => {
  const t = sumPerformance([
    { spend: 100, impressions: 1000, clicks: 10, conversions: 1, revenue: 300 },
    { spend: 300, impressions: 3000, clicks: 90, conversions: 9, revenue: 900 },
  ]);
  assert.equal(t.spend, 400);
  close(roas(t.revenue, t.spend), 3); // 1,200 / 400, not mean(3, 3)
  close(ctr(t.clicks, t.impressions), 0.025); // 100 / 4,000 (mean of ratios would be 0.02)
});

const path: ConversionPath = { id: "P1", revenue: 100, touches: [{ channel: "A", daysBefore: 10 }, { channel: "B", daysBefore: 3 }, { channel: "C", daysBefore: 0 }] };

test("attribution touch weights", () => {
  assert.deepEqual(touchWeights(path.touches, "first_touch"), [1, 0, 0]);
  assert.deepEqual(touchWeights(path.touches, "last_touch"), [0, 0, 1]);
  touchWeights(path.touches, "linear").forEach((w) => close(w, 1 / 3));
  const pos = touchWeights(path.touches, "position_based");
  close(pos[0], 0.4); close(pos[1], 0.2); close(pos[2], 0.4);
  // time decay: 2^(−10/7)=0.371499, 2^(−3/7)=0.742997, 1 → sum 2.114496
  const td = touchWeights(path.touches, "time_decay");
  close(td[0], 0.371499 / 2.114496); close(td[1], 0.742997 / 2.114496); close(td[2], 1 / 2.114496);
  assert.deepEqual(touchWeights([{ channel: "A", daysBefore: 0 }, { channel: "B", daysBefore: 0 }], "position_based"), [0.5, 0.5]);
});

test("attribution never double counts: every model reconciles", () => {
  const paths: ConversionPath[] = [path, { id: "P2", revenue: 50, touches: [{ channel: "A", daysBefore: 0 }] }, { id: "P3", revenue: 80, touches: [{ channel: "B", daysBefore: 5 }, { channel: "A", daysBefore: 0 }] }];
  for (const m of ["first_touch", "last_touch", "linear", "time_decay", "position_based"] as const) {
    const credits = attribute(paths, m);
    const r = reconcile(paths, credits);
    assert.ok(r.balanced, `${m} did not reconcile`);
    close(r.attributedRevenue, 230);
    close(r.attributedConversions, 3);
  }
  // first touch: A gets P1 (100) + P2 (50) = 150; B gets P3 (80)
  const ft = Object.fromEntries(attribute(paths, "first_touch").map((c) => [c.channel, c.revenue]));
  assert.equal(ft.A, 150); assert.equal(ft.B, 80);
});

test("normal CDF and two-proportion test", () => {
  close(normalCdf(0), 0.5, 1e-7);
  close(normalCdf(1.959964), 0.975, 1e-6);
  // A 100/1000, B 130/1000: pooled p = 0.115, SE = √(0.115·0.885·0.002) = 0.0142671, z = 0.03/SE = 2.10274
  const r = compareProportions({ visitors: 1000, conversions: 100 }, { visitors: 1000, conversions: 130 });
  close(r.z, 2.10274, 1e-4);
  close(r.pValue, 0.03549, 2e-4);
  assert.equal(r.verdict, "B leads");
  close(r.relativeLift, 0.3);
  const flat = compareProportions({ visitors: 1000, conversions: 100 }, { visitors: 1000, conversions: 104 });
  assert.equal(flat.verdict, "Inconclusive");
  assert.ok(flat.ciLow < 0 && flat.ciHigh > 0);
});

test("sample size for 8% → 9% at α=0.05, power=0.8 is ~12.2k per arm", () => {
  const n = sampleSizePerArm(0.08, 0.01);
  assert.ok(n > 12_100 && n < 12_300, String(n));
});

test("scenario curve passes through the observed point and saturates", () => {
  const b = { channel: "X", spend: 50_000, revenue: 200_000, saturation: 40_000 };
  close(projectedRevenue(b, 50_000), 200_000, 1e-6);
  assert.ok(projectedRevenue(b, 100_000) < 400_000, "doubling spend must not double revenue");
  assert.ok(marginalRoas(b, 100_000) < marginalRoas(b, 50_000), "marginal returns diminish");
  const rows = runScenario([b], { X: 1 });
  close(rows[0].deltaRevenue, 0, 1e-6);
  const band = scenarioBand([b], { X: 1.5 });
  assert.ok(band.low <= band.mid && band.mid <= band.high);
});
