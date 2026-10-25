"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, DataTable, Gate, GRID, Panel, Segmented, axisProps, growthTooltip, useFilters } from "../ui";
import { MODEL_DESCRIPTIONS, MODEL_LABELS, attribute, reconcile, type AttributionModel } from "@/lib/attribution";
import { channelColors, conversionPaths, liveCampaigns, type Channel } from "@/lib/demo-data";
import { roas } from "@/lib/metrics";
import { fmtCompactCurrency, fmtCurrency, fmtNumber, fmtPct, fmtRatio } from "@/lib/format";

const MODELS = Object.keys(MODEL_LABELS) as AttributionModel[];
const SHORT: Record<AttributionModel, string> = { first_touch: "First", last_touch: "Last", linear: "Linear", time_decay: "Decay", position_based: "Position" };
const MODEL_COLORS = ["#8fb2ff", "#3d7bff", "#2ec5b6", "#f2b544", "#ff6b6b"];

export default function Attribution() {
  const { channels } = useFilters();
  const [model, setModel] = useState<AttributionModel>("position_based");
  const all = useMemo(() => Object.fromEntries(MODELS.map((m) => [m, attribute(conversionPaths, m)])) as Record<AttributionModel, ReturnType<typeof attribute>>, []);
  const rec = reconcile(conversionPaths, all[model]);
  const chartData = channels.map((ch) => ({ channel: ch, ...Object.fromEntries(MODELS.map((m) => [SHORT[m], Math.round(all[m].find((x) => x.channel === ch)?.revenue ?? 0)])) }));
  const pathLen = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    conversionPaths.forEach((p) => counts[Math.min(5, p.touches.length) - 1]++);
    return counts;
  }, []);
  const recon = liveCampaigns.map((c) => ({ ...c, gap: c.platformConversions / c.measuredConversions - 1 }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<AttributionModel> label="Attribution model" value={model} onChange={setModel} options={MODELS.map((m) => ({ id: m, label: SHORT[m] }))} />
        <p className="text-[11.5px] text-mist">{MODEL_DESCRIPTIONS[model]}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Revenue credit by model" subtitle={`${conversionPaths.length} measured conversion paths · rule-based allocation`}>
          <Gate chart>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ left: -4, right: 4, top: 6 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="channel" {...axisProps} interval={0} tick={{ fontSize: 10, fill: "#7e8bb0" }} />
                  <YAxis {...axisProps} tickFormatter={(v) => fmtCompactCurrency(v)} width={50} />
                  <Tooltip {...growthTooltip} cursor={{ fill: "#18264f" }} formatter={(v) => fmtCurrency(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {MODELS.map((m, i) => <Bar key={m} dataKey={SHORT[m]} fill={MODEL_COLORS[i]} fillOpacity={m === model ? 1 : 0.28} radius={[2, 2, 0, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Gate>
        </Panel>
        <Panel title={`${MODEL_LABELS[model]} · allocation`} actions={rec.balanced ? <Badge tone="teal"><CheckCircle2 className="h-3 w-3" aria-hidden /> reconciled</Badge> : <Badge tone="coral">mismatch</Badge>}>
          <Gate rows={6}>
            <table className="w-full text-[12.5px]">
              <thead><tr className="border-b border-slate-line text-left text-[10.5px] uppercase text-mist"><th className="pb-1.5">Channel</th><th className="pb-1.5 text-right">Conv.</th><th className="pb-1.5 text-right">Revenue</th><th className="pb-1.5 text-right">Share</th></tr></thead>
              <tbody>
                {all[model].filter((c) => channels.includes(c.channel as Channel)).map((c) => (
                  <tr key={c.channel} className="border-b border-slate-line/50">
                    <td className="py-1.5"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: channelColors[c.channel as Channel].b }} />{c.channel}</td>
                    <td className="py-1.5 text-right font-mono">{fmtNumber(c.conversions, 1)}</td>
                    <td className="py-1.5 text-right font-mono text-white">{fmtCurrency(c.revenue)}</td>
                    <td className="py-1.5 text-right font-mono">{fmtPct(c.revenue / rec.measuredRevenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="font-mono text-[11.5px]"><td className="pt-2 text-mist">All channels</td><td className="pt-2 text-right">{fmtNumber(rec.attributedConversions, 1)}</td><td className="pt-2 text-right text-white">{fmtCurrency(rec.attributedRevenue)}</td><td className="pt-2 text-right">100%</td></tr></tfoot>
            </table>
            <p className="mt-2 text-[11px] text-mist">Measured: {rec.measuredConversions} conversions / {fmtCurrency(rec.measuredRevenue)}. Every conversion allocates exactly 1.0 credit.</p>
          </Gate>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Platform-reported vs measured conversions" subtitle="Never summed across platforms — avoids double counting">
          <Gate rows={6}>
            <DataTable
              rows={recon}
              rowKey={(r) => r.id}
              dense
              cols={[
                { key: "n", label: "Campaign", render: (r) => <span className="text-white">{r.name}</span> },
                { key: "pl", label: "Platform", align: "right", render: (r) => r.platformConversions.toLocaleString(), sort: (r) => r.platformConversions },
                { key: "me", label: "Measured", align: "right", render: (r) => r.measuredConversions.toLocaleString(), sort: (r) => r.measuredConversions },
                { key: "gap", label: "Over-report", align: "right", render: (r) => <span className={r.gap > 0.25 ? "text-amber-signal" : ""}>{fmtPct(r.gap)}</span>, sort: (r) => r.gap },
                { key: "pr", label: "ROAS (platform)", align: "right", render: (r) => fmtRatio(roas((r.revenue * r.platformConversions) / r.measuredConversions, r.spend)) },
                { key: "mr", label: "ROAS (measured)", align: "right", render: (r) => <span className="text-white">{fmtRatio(roas(r.revenue, r.spend))}</span> },
              ]}
            />
          </Gate>
        </Panel>
        <Panel title="Data coverage & limitations">
          <ul className="space-y-2 text-[12px]">
            <li className="flex justify-between"><span className="text-mist">Path length distribution</span><span className="font-mono text-white">{pathLen.map((c, i) => `${i + 1}${i === 4 ? "+" : ""}:${c}`).join("  ")}</span></li>
            <li className="flex justify-between"><span className="text-mist">Orders with ≥1 tracked touch</span><span className="font-mono text-white">94.1% <Badge tone="amber">synthetic</Badge></span></li>
            <li className="flex justify-between"><span className="text-mist">Impression-only exposure</span><span className="font-mono text-white">not observed</span></li>
            <li className="flex justify-between"><span className="text-mist">Incrementality tests on file</span><span className="font-mono text-white">0</span></li>
          </ul>
          <p className="mt-3 rounded-lg border border-amber-signal/30 bg-amber-signal/10 p-2.5 text-[11.5px] text-amber-signal">Attribution allocates credit; it does not measure incremental impact. ‘Platform ROAS’ above scales revenue by platform conversions for comparison only.</p>
        </Panel>
      </div>
    </div>
  );
}
