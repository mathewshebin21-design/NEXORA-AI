"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, Eyebrow, Gate, PageHeader, Rule, atelierTooltip } from "../ui";
import { MODEL_DESCRIPTIONS, MODEL_LABELS, attribute, reconcile, type AttributionModel } from "@/lib/attribution";
import { channelColors, conversionPaths, type Channel } from "@/lib/demo-data";
import { cn, fmtCurrency, fmtNumber, fmtPct } from "@/lib/format";

const MODELS = Object.keys(MODEL_LABELS) as AttributionModel[];

export default function Attribution() {
  const [model, setModel] = useState<AttributionModel>("position_based");
  const credits = useMemo(() => attribute(conversionPaths, model), [model]);
  const rec = reconcile(conversionPaths, credits);
  const all = useMemo(() => Object.fromEntries(MODELS.map((m) => [m, attribute(conversionPaths, m)])), []);
  const channels = credits.map((c) => c.channel);

  return (
    <div>
      <PageHeader
        eyebrow="Revenue attribution"
        title={<>Where the <span className="italic text-champagne-deep">credit</span> belongs</>}
        intro={`${fmtNumber(conversionPaths.length)} measured conversion paths. Each model is a rule for sharing credit — none of them proves a channel caused a sale.`}
      />
      <div className="mt-8 flex flex-wrap gap-2" role="radiogroup" aria-label="Attribution model">
        {MODELS.map((m) => (
          <button key={m} role="radio" aria-checked={model === m} onClick={() => setModel(m)} className={cn("rounded-full border px-4 py-1.5 text-sm", model === m ? "border-graphite bg-graphite text-ivory" : "border-parchment hover:border-champagne")}>{MODEL_LABELS[m]}</button>
        ))}
      </div>
      <p className="mt-3 font-serif text-lg italic text-graphite-soft">{MODEL_DESCRIPTIONS[model]}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <Card className="flex flex-col items-center p-8">
          <Gate rows={5} className="w-full">
            <div className="relative mx-auto h-72 w-full max-w-sm">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={credits} dataKey="revenue" nameKey="channel" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none" animationDuration={700}>
                    {credits.map((c) => <Cell key={c.channel} fill={channelColors[c.channel as Channel].a} />)}
                  </Pie>
                  <Tooltip {...atelierTooltip} formatter={(v) => fmtCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div><p className="text-[11px] uppercase tracking-[0.16em] text-stone">Measured revenue</p><p className="font-serif text-3xl tabular">{fmtCurrency(rec.measuredRevenue)}</p></div>
              </div>
            </div>
            <p className={cn("mt-4 inline-flex max-w-full items-center gap-2 rounded-2xl px-3 py-1 text-xs", rec.balanced ? "bg-[#e3e8dc] text-[#4d5a41]" : "bg-[#f1ddd8] text-rosewood")}>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Reconciled: {fmtNumber(rec.attributedConversions, 0)} of {fmtNumber(rec.measuredConversions)} conversions allocated — no double counting
            </p>
          </Gate>
        </Card>

        <Gate rows={6}>
          <ul className="divide-y divide-parchment border-y border-parchment">
            {credits.map((c) => (
              <motion.li layout key={c.channel} className="flex items-center gap-4 py-4">
                <span className="h-3 w-3 rounded-full" style={{ background: channelColors[c.channel as Channel].a }} />
                <span className="min-w-0 flex-1 truncate font-serif text-xl">{c.channel}</span>
                <span className="hidden w-24 text-right text-sm text-stone tabular sm:inline">{fmtNumber(c.conversions, 1)} conv.</span>
                <span className="w-28 text-right font-serif text-xl tabular">{fmtCurrency(c.revenue)}</span>
                <span className="w-14 text-right text-xs text-stone tabular">{fmtPct(c.revenue / rec.measuredRevenue, 0)}</span>
              </motion.li>
            ))}
          </ul>
        </Gate>
      </div>

      <Rule label="How the models disagree" />
      <Gate rows={4}>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-stone">
                <th className="pb-3 font-medium">Channel</th>
                {MODELS.map((m) => <th key={m} className={cn("pb-3 text-right font-medium", m === model && "text-graphite")}>{MODEL_LABELS[m].split(" (")[0]}</th>)}
              </tr>
            </thead>
            <tbody>
              {channels.map((ch) => (
                <tr key={ch} className="border-t border-parchment">
                  <td className="py-3 font-serif text-lg">{ch}</td>
                  {MODELS.map((m) => {
                    const v = all[m].find((x) => x.channel === ch)?.revenue ?? 0;
                    return <td key={m} className={cn("py-3 text-right tabular", m === model && "font-semibold")}>{fmtCurrency(v)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Gate>
      <Card className="mt-10 bg-ivory-deep">
        <Eyebrow>Coverage &amp; limitations</Eyebrow>
        <ul className="mt-3 grid gap-2 text-sm text-graphite-soft md:grid-cols-2">
          <li>• Paths built from first-party sessions joined to orders; impression-only exposures are not observed.</li>
          <li>• Cross-device journeys without login are split — undercounts multi-touch paths.</li>
          <li>• Organic Social touches rely on UTM tagging (est. 60–70% coverage, unverified).</li>
          <li>• For incrementality, run a geo holdout or conversion-lift test; this view will not claim lift.</li>
        </ul>
      </Card>
    </div>
  );
}
