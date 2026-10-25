"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { CartesianGrid, ErrorBar, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, ReferenceLine, BarChart, Bar } from "recharts";
import { Badge, DataTable, Gate, GRID, Panel, axisProps, growthTooltip, useFilters } from "../ui";
import { experiments, liveCampaigns, type Campaign } from "@/lib/demo-data";
import { METRIC_DEFINITIONS, campaignProfit, conversionRate, cpa, cpc, cpm, ctr, roas } from "@/lib/metrics";
import { compareProportions } from "@/lib/stats";
import { cn, fmtCompactCurrency, fmtCurrency, fmtPct, fmtRatio } from "@/lib/format";

export default function Performance() {
  const { channels } = useFilters();
  const [open, setOpen] = useState<Campaign | null>(null);
  const rows = liveCampaigns.filter((c) => channels.includes(c.channel));
  const exps = experiments.map((e) => ({ e, r: compareProportions(e.a, e.b) }));

  return (
    <div className="space-y-4">
      <Panel title="Campaign performance" subtitle={`${rows.length} campaigns · measured conversions · click a row for metric lineage`}>
        <Gate rows={8}>
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            onRow={setOpen}
            selected={open?.id}
            dense
            cols={[
              { key: "n", label: "Campaign", render: (r) => <span><span className="text-white">{r.name}</span><span className="block text-[10.5px] text-mist">{r.id} · {r.platform}</span></span> },
              { key: "st", label: "Status", render: (r) => <Badge tone={r.status === "Live" ? "teal" : r.status === "Learning" ? "amber" : "slate"}>{r.status}</Badge> },
              { key: "sp", label: "Spend", align: "right", render: (r) => fmtCompactCurrency(r.spend), sort: (r) => r.spend },
              { key: "ctr", label: "CTR", align: "right", render: (r) => fmtPct(ctr(r.clicks, r.impressions), 2), sort: (r) => ctr(r.clicks, r.impressions) ?? 0 },
              { key: "cpc", label: "CPC", align: "right", render: (r) => fmtCurrency(cpc(r.spend, r.clicks), 2), sort: (r) => cpc(r.spend, r.clicks) ?? 0 },
              { key: "cpm", label: "CPM", align: "right", render: (r) => fmtCurrency(cpm(r.spend, r.impressions), 2), sort: (r) => cpm(r.spend, r.impressions) ?? 0 },
              { key: "cvr", label: "CVR", align: "right", render: (r) => fmtPct(conversionRate(r.measuredConversions, r.clicks), 2), sort: (r) => conversionRate(r.measuredConversions, r.clicks) ?? 0 },
              { key: "cpa", label: "CPA", align: "right", render: (r) => fmtCurrency(cpa(r.spend, r.measuredConversions), 2), sort: (r) => cpa(r.spend, r.measuredConversions) ?? 0 },
              { key: "roas", label: "ROAS", align: "right", render: (r) => <span className="text-white">{fmtRatio(roas(r.revenue, r.spend))}</span>, sort: (r) => roas(r.revenue, r.spend) ?? 0 },
              { key: "pr", label: "Profit", align: "right", render: (r) => { const p = campaignProfit(r.revenue, r.cogs, r.spend); return <span className={p < 0 ? "text-coral-signal" : "text-teal"}>{fmtCompactCurrency(p)}</span>; }, sort: (r) => campaignProfit(r.revenue, r.cogs, r.spend) },
            ]}
          />
        </Gate>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Efficiency frontier" subtitle="Spend (x) vs measured ROAS (y) · bubble = measured orders">
          <Gate chart>
            <div className="h-[280px]">
              <ResponsiveContainer>
                <ScatterChart margin={{ left: -6, right: 16, top: 10 }}>
                  <CartesianGrid stroke={GRID} />
                  <XAxis type="number" dataKey="spend" name="Spend" {...axisProps} tickFormatter={(v) => fmtCompactCurrency(v)} />
                  <YAxis type="number" dataKey="roas" name="ROAS" {...axisProps} tickFormatter={(v) => `${v}×`} domain={[0, 14]} allowDataOverflow />
                  <ZAxis type="number" dataKey="orders" range={[60, 700]} name="Orders" />
                  <ReferenceLine y={1} stroke="#ff6b6b" strokeDasharray="4 4" label={{ value: "break-even (pre-COGS)", fill: "#ff6b6b", fontSize: 10, position: "insideTopRight" }} />
                  <Tooltip {...growthTooltip} formatter={(v, n) => (n === "Spend" ? fmtCurrency(Number(v)) : n === "ROAS" ? fmtRatio(Number(v)) : String(v))} />
                  <Scatter data={rows.map((c) => ({ name: c.name, spend: c.spend, roas: Number((roas(c.revenue, c.spend) ?? 0).toFixed(2)), orders: c.measuredConversions }))} fill="#3d7bff" fillOpacity={0.65} stroke="#8fb2ff" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10.5px] text-mist">Email (Linen Restock, 62.6×) clipped at 14× — spend reflects ESP cost only.</p>
          </Gate>
        </Panel>
        <Panel title="Experiments" subtitle="Two-proportion z-test · 95% CI on absolute difference (B − A)">
          <Gate chart>
            <div className="h-[200px]">
              <ResponsiveContainer>
                <BarChart data={exps.map(({ e, r }) => ({ name: e.id, lift: +(r.absoluteLift * 100).toFixed(3), err: [+((r.absoluteLift - r.ciLow) * 100).toFixed(3), +((r.ciHigh - r.absoluteLift) * 100).toFixed(3)] }))} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis type="number" {...axisProps} tickFormatter={(v) => `${v}pt`} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={56} />
                  <ReferenceLine x={0} stroke="#a7b3d1" />
                  <Tooltip {...growthTooltip} cursor={{ fill: "#18264f" }} formatter={(v) => `${v} pts`} />
                  <Bar dataKey="lift" name="Δ (pts)" fill="#2ec5b6" barSize={10} radius={2}>
                    <ErrorBar dataKey="err" width={6} stroke="#e6ecff" direction="x" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1 text-[11.5px]">
              {exps.map(({ e, r }) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-2"><span className="text-white">{e.id} · {e.name}</span><span className={cn("font-mono", r.significant ? "text-teal" : "text-mist")}>{e.status === "Running" ? "interim · " : ""}{r.verdict} · p={r.pValue.toFixed(3)}</span></li>
              ))}
            </ul>
          </Gate>
        </Panel>
      </div>

      <AnimatePresence>
        {open && (
          <motion.aside role="dialog" aria-label={`${open.name} details`} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 300 }} className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-slate-line bg-navy p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div><p className="font-mono text-[11px] text-mist">{open.id} · {open.platform}</p><h2 className="text-lg font-semibold text-white">{open.name}</h2></div>
              <button onClick={() => setOpen(null)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md text-mist hover:bg-navy-3"><X className="h-4 w-4" aria-hidden /></button>
            </div>
            <p className="mt-4 text-[10.5px] uppercase tracking-wider text-mist">Raw inputs</p>
            <dl className="mt-1 grid grid-cols-2 gap-2 font-mono text-[12px]">
              {[["spend", fmtCurrency(open.spend)], ["impressions", open.impressions.toLocaleString()], ["clicks", open.clicks.toLocaleString()], ["platform_conv", open.platformConversions.toLocaleString()], ["measured_orders", open.measuredConversions.toLocaleString()], ["revenue", fmtCurrency(open.revenue)], ["cogs", fmtCurrency(open.cogs)], ["new_customers", open.newCustomers.toLocaleString()]].map(([k, v]) => (
                <div key={k} className="rounded-md bg-midnight/60 p-2"><dt className="text-[10px] text-mist">{k}</dt><dd className="text-white">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-5 text-[10.5px] uppercase tracking-wider text-mist">Derived metrics & lineage</p>
            <ul className="mt-1 space-y-1.5 text-[12px]">
              {(["ctr", "cpc", "cpm", "cvr", "cpa", "cac", "roas", "profit"] as const).map((k) => {
                const d = METRIC_DEFINITIONS[k];
                const v = { ctr: fmtPct(ctr(open.clicks, open.impressions), 2), cpc: fmtCurrency(cpc(open.spend, open.clicks), 2), cpm: fmtCurrency(cpm(open.spend, open.impressions), 2), cvr: fmtPct(conversionRate(open.measuredConversions, open.clicks), 2), cpa: fmtCurrency(cpa(open.spend, open.measuredConversions), 2), cac: fmtCurrency(open.newCustomers ? open.spend / open.newCustomers : null, 2), roas: fmtRatio(roas(open.revenue, open.spend)), profit: fmtCurrency(campaignProfit(open.revenue, open.cogs, open.spend)) }[k];
                return (
                  <li key={k} className="rounded-md border border-slate-line/60 p-2">
                    <div className="flex justify-between"><span className="text-white">{d.label}</span><span className="font-mono text-white">{v}</span></div>
                    <p className="font-mono text-[10.5px] text-electric-soft">{d.formula}</p>
                    <p className="font-mono text-[10px] text-mist">{d.inputs.join(" · ")}</p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[11px] text-amber-signal">Platform reports {fmtPct(open.platformConversions / Math.max(1, open.measuredConversions) - 1)} more conversions than measured. Measured values are used above.</p>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
