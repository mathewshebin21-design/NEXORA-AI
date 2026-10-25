"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, ArrowRight, Info, Sparkles } from "lucide-react";
import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Gate, GRID, Kpi, Panel, axisProps, growthTooltip, useFilters } from "../ui";
import { channelTotals, daily, forecast, funnel, recommendations } from "@/lib/demo-data";
import { roas, safeDiv } from "@/lib/metrics";
import { fmtCompactCurrency, fmtCurrency, fmtPct, fmtRatio } from "@/lib/format";
import { GROWTH_BASE } from "@/lib/screens";

function windowSums(days: typeof daily) {
  return days.reduce((a, d) => ({ revenue: a.revenue + d.revenue, spend: a.spend + d.spend, orders: a.orders + d.orders, sessions: a.sessions + d.sessions }), { revenue: 0, spend: 0, orders: 0, sessions: 0 });
}
const change = (cur: number | null, prev: number | null) => (cur === null || prev === null || prev === 0 ? null : cur / prev - 1);

export default function Overview() {
  const { range, channels, compare } = useFilters();
  const cur = windowSums(daily.slice(-range));
  const prev = daily.length >= range * 2 ? windowSums(daily.slice(-range * 2, -range)) : null;
  const d = (f: (x: ReturnType<typeof windowSums>) => number | null) => (compare && prev ? change(f(cur), f(prev)) : null);
  const series = useMemo(() => {
    const hist = daily.slice(-range).map((x, i, arr) => ({ label: x.label, revenue: x.revenue as number | null, spend: x.spend as number | null, fc: i === arr.length - 1 ? x.revenue : (null as number | null) }));
    const fc = forecast.map((x) => ({ label: x.label, revenue: null, spend: null, fc: x.revenue }));
    return [...hist, ...fc];
  }, [range]);
  const chans = channelTotals.filter((c) => channels.includes(c.channel));
  const maxRev = Math.max(...chans.map((c) => c.revenue), 1);

  return (
    <div className="space-y-4">
      <Gate rows={2}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Revenue" value={fmtCompactCurrency(cur.revenue)} delta={d((x) => x.revenue)} spark={daily.slice(-range).map((x) => x.revenue)} formula="Σ commerce.orders.revenue" />
          <Kpi label="Media spend" value={fmtCompactCurrency(cur.spend)} delta={d((x) => x.spend)} inverse spark={daily.slice(-range).map((x) => x.spend)} formula="Σ ad_platform.spend" />
          <Kpi label="MER" value={fmtRatio(safeDiv(cur.revenue, cur.spend))} delta={d((x) => safeDiv(x.revenue, x.spend))} formula="total revenue ÷ total spend" />
          <Kpi label="Orders" value={cur.orders.toLocaleString()} delta={d((x) => x.orders)} spark={daily.slice(-range).map((x) => x.orders)} formula="count(commerce.orders)" />
          <Kpi label="AOV" value={fmtCurrency(safeDiv(cur.revenue, cur.orders), 2)} delta={d((x) => safeDiv(x.revenue, x.orders))} formula="revenue ÷ orders" />
          <Kpi label="Session CVR" value={fmtPct(safeDiv(cur.orders, cur.sessions), 2)} delta={d((x) => safeDiv(x.orders, x.sessions))} formula="orders ÷ sessions" />
        </div>
      </Gate>
      {compare && !prev && <p className="flex items-center gap-1.5 text-[11px] text-mist"><Info className="h-3 w-3" aria-hidden /> Prior-period comparison unavailable: only 90 days of history are loaded. Choose 30D or 60D to compare.</p>}

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Panel title="Revenue, spend & 30-day projection" subtitle="Projection = trailing 28-day mean × trailing 4-week growth. Planning aid, not a promise." actions={<Badge tone="amber">Synthetic</Badge>}>
          <Gate chart>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <ComposedChart data={series} margin={{ left: -8, right: 4, top: 8 }}>
                  <defs>
                    <linearGradient id="g-rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3d7bff" stopOpacity={0.35} /><stop offset="1" stopColor="#3d7bff" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" {...axisProps} interval={Math.ceil(series.length / 8)} />
                  <YAxis yAxisId="r" {...axisProps} tickFormatter={(v) => fmtCompactCurrency(v)} width={56} />
                  <YAxis yAxisId="s" orientation="right" {...axisProps} domain={[0, (max: number) => Math.ceil(max * 3)]} tickFormatter={(v) => fmtCompactCurrency(v)} width={48} />
                  <Tooltip {...growthTooltip} formatter={(v, n) => [v === null ? "—" : fmtCurrency(Number(v)), n]} />
                  <Bar yAxisId="s" dataKey="spend" name="Spend" fill="#2ec5b6" opacity={0.45} barSize={4} radius={[2, 2, 0, 0]} />
                  <Area yAxisId="r" type="monotone" dataKey="revenue" name="Revenue" stroke="#3d7bff" strokeWidth={1.8} fill="url(#g-rev)" connectNulls={false} />
                  <Line yAxisId="r" type="monotone" dataKey="fc" name="Projection" stroke="#8fb2ff" strokeDasharray="5 4" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Gate>
        </Panel>

        <Panel title="Channel mix" subtitle="Measured revenue & ROAS · filtered by channel selector" actions={<Link href={`${GROWTH_BASE}/attribution`} className="text-[11px] text-electric-soft hover:underline">Attribution →</Link>}>
          <Gate rows={6}>
            <ul className="space-y-3">
              {chans.map((c) => (
                <li key={c.channel}>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-white">{c.channel} {!c.paid && <Badge>owned</Badge>}</span>
                    <span className="font-mono text-mist">{fmtCompactCurrency(c.revenue)} · <span className="text-white">{c.paid ? fmtRatio(roas(c.revenue, c.spend)) : "n/a"}</span></span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-navy-3"><div className="h-1.5 rounded-full bg-gradient-to-r from-electric to-teal transition-all duration-700" style={{ width: `${(c.revenue / maxRev) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </Gate>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Conversion funnel" subtitle="Last 90 days · step conversion">
          <Gate rows={5}>
            <ol className="space-y-2">
              {funnel.map((f, i) => (
                <li key={f.stage}>
                  <div className="flex justify-between text-[12px]"><span>{f.stage}</span><span className="font-mono text-white">{f.value.toLocaleString()}</span></div>
                  <div className="mt-1 h-5 rounded bg-navy-3"><div className="flex h-5 items-center justify-end rounded bg-electric/70 pr-1.5 font-mono text-[10px] text-white" style={{ width: `${Math.max(8, (f.value / funnel[0].value) * 100)}%` }}>{i > 0 ? fmtPct(f.value / funnel[i - 1].value, 0) : ""}</div></div>
                </li>
              ))}
            </ol>
          </Gate>
        </Panel>
        <Panel title="Alerts" subtitle="Rule-based monitors">
          <Gate rows={4}>
            <ul className="space-y-2.5 text-[12.5px]">
              {[
                { t: "Meta-reported conversions 28.7% above matched orders", c: "CMP-1041", tone: "amber" as const },
                { t: "LinkedIn Ads sync failing — token expired", c: "Integration", tone: "coral" as const },
                { t: "Video Stories still in learning after 26 days", c: "CMP-1047", tone: "amber" as const },
                { t: "PDP hero test reached significance", c: "EXP-31", tone: "teal" as const },
              ].map((a) => (
                <li key={a.t} className="flex items-start gap-2.5 rounded-lg border border-slate-line/60 p-2.5">
                  <AlertTriangle className={a.tone === "coral" ? "h-4 w-4 shrink-0 text-coral-signal" : a.tone === "teal" ? "h-4 w-4 shrink-0 text-teal" : "h-4 w-4 shrink-0 text-amber-signal"} aria-hidden />
                  <span className="flex-1">{a.t}</span><Badge>{a.c}</Badge>
                </li>
              ))}
            </ul>
          </Gate>
        </Panel>
        <Panel title="Top insights" subtitle="Evidence-backed; approval required to act" actions={<Sparkles className="h-4 w-4 text-electric-soft" aria-hidden />}>
          <Gate rows={4}>
            <ul className="space-y-2.5">
              {recommendations.slice(0, 3).map((r) => (
                <li key={r.id}>
                  <Link href={`${GROWTH_BASE}/insights`} className="group block rounded-lg border border-slate-line/60 p-2.5 hover:border-electric/60">
                    <div className="flex items-center gap-1.5"><Badge tone="blue">{r.kind}</Badge><Badge tone={r.confidence === "High" ? "teal" : r.confidence === "Medium" ? "amber" : "coral"}>{r.confidence}</Badge></div>
                    <p className="mt-1.5 text-[12.5px] text-white">{r.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-mist">{r.evidence.length} cited records <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" aria-hidden /></p>
                  </Link>
                </li>
              ))}
            </ul>
          </Gate>
        </Panel>
      </div>
    </div>
  );
}
