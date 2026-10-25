"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Info } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, Eyebrow, Gate, PageHeader, Pill, Rule, atelierTooltip } from "../ui";
import { experiments, liveCampaigns, PERIOD_LABEL } from "@/lib/demo-data";
import { METRIC_DEFINITIONS, conversionRate, cpa, ctr, roas } from "@/lib/metrics";
import { compareProportions } from "@/lib/stats";
import { cn, fmtCurrency, fmtNumber, fmtPct, fmtRatio } from "@/lib/format";

const METRICS = {
  roas: { label: "Measured ROAS", fn: (c: (typeof liveCampaigns)[0]) => roas(c.revenue, c.spend), fmt: (v: number | null) => fmtRatio(v), better: "high" },
  cpa: { label: "CPA", fn: (c: (typeof liveCampaigns)[0]) => cpa(c.spend, c.measuredConversions), fmt: (v: number | null) => fmtCurrency(v, 2), better: "low" },
  ctr: { label: "CTR", fn: (c: (typeof liveCampaigns)[0]) => ctr(c.clicks, c.impressions), fmt: (v: number | null) => fmtPct(v, 2), better: "high" },
  cvr: { label: "Conversion rate", fn: (c: (typeof liveCampaigns)[0]) => conversionRate(c.measuredConversions, c.clicks), fmt: (v: number | null) => fmtPct(v, 2), better: "high" },
} as const;
type MetricKey = keyof typeof METRICS;

export default function Performance() {
  const [metric, setMetric] = useState<MetricKey>("roas");
  const m = METRICS[metric];
  const ranked = useMemo(
    () => [...liveCampaigns].map((c) => ({ c, v: m.fn(c) ?? 0 })).sort((a, b) => (m.better === "high" ? b.v - a.v : a.v - b.v)),
    [m],
  );
  const def = METRIC_DEFINITIONS[metric];

  return (
    <div>
      <PageHeader eyebrow={`Performance · ${PERIOD_LABEL}`} title={<>How the work is <span className="italic text-champagne-deep">performing</span></>} intro="Rankings use independently measured orders. Platform-reported figures are shown alongside, never blended." />

      <div className="mt-8 flex flex-wrap items-center gap-2" role="tablist" aria-label="Ranking metric">
        {(Object.keys(METRICS) as MetricKey[]).map((k) => (
          <button key={k} role="tab" aria-selected={metric === k} onClick={() => setMetric(k)} className={cn("rounded-full border px-4 py-1.5 text-sm", metric === k ? "border-graphite bg-graphite text-ivory" : "border-parchment hover:border-champagne")}>{METRICS[k].label}</button>
        ))}
        <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-ivory-deep px-3 py-1.5 text-xs text-graphite-soft" title={def.inputs.join(", ")}>
          <Info className="h-3.5 w-3.5" aria-hidden /> {def.label} = {def.formula}
        </span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <Gate rows={6}>
          <ol className="divide-y divide-parchment border-y border-parchment">
            {ranked.map(({ c, v }, i) => (
              <motion.li layout key={c.id} className="flex items-center gap-5 py-4">
                <span className="w-8 font-serif text-3xl text-champagne-deep tabular">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-serif text-xl">{c.name}</p>
                  <p className="text-xs text-stone">{c.channel} · {fmtCurrency(c.spend)} spend · {fmtNumber(c.measuredConversions)} measured orders</p>
                </div>
                <span className="font-serif text-2xl tabular">{m.fmt(v)}</span>
              </motion.li>
            ))}
          </ol>
        </Gate>
        <Card>
          <Eyebrow>Reported vs measured conversions</Eyebrow>
          <p className="mt-1 text-sm text-stone">Ad platforms count view-throughs and modelled conversions. We plan on measured orders.</p>
          <Gate rows={5} className="mt-4">
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart data={liveCampaigns.map((c) => ({ name: c.name.split(/[—:]/)[0].trim(), Platform: c.platformConversions, Measured: c.measuredConversions }))} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid horizontal={false} stroke="#e6dcc8" strokeDasharray="2 6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#8a8378" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "#4a4640" }} axisLine={false} tickLine={false} />
                  <Tooltip {...atelierTooltip} cursor={{ fill: "#efe8da" }} />
                  <Bar dataKey="Platform" fill="#e6dcc8" radius={[0, 6, 6, 0]} barSize={9} />
                  <Bar dataKey="Measured" fill="#9c7e45" radius={[0, 6, 6, 0]} barSize={9} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Gate>
        </Card>
      </div>

      <Rule label="Experiments" />
      <Gate rows={3}>
        <div className="grid gap-6 md:grid-cols-3">
          {experiments.map((e) => {
            const r = compareProportions(e.a, e.b);
            return (
              <Card key={e.id}>
                <div className="flex items-center justify-between"><Eyebrow>{e.id} · {e.metric}</Eyebrow><Pill tone={e.status === "Running" ? "gold" : "neutral"}>{e.status}</Pill></div>
                <p className="mt-2 font-serif text-xl leading-snug">{e.name}</p>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs text-stone">A</p><p className="font-serif text-2xl tabular">{fmtPct(r.rateA, 2)}</p></div>
                  <div><p className="text-xs text-stone">B</p><p className="font-serif text-2xl tabular">{fmtPct(r.rateB, 2)}</p></div>
                </div>
                <p className={cn("mt-4 text-sm", r.significant ? "text-[#4d5a41]" : "text-graphite-soft")}>
                  {e.status === "Running" ? "Interim — do not call early. " : ""}{r.verdict}: Δ {fmtPct(r.absoluteLift, 2)} (95% CI {fmtPct(r.ciLow, 2)} to {fmtPct(r.ciHigh, 2)}), p = {r.pValue.toFixed(3)}
                </p>
              </Card>
            );
          })}
        </div>
      </Gate>
    </div>
  );
}
