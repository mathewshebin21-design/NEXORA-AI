"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Gate, GRID, Panel, axisProps, growthTooltip } from "../ui";
import { campaignDraft, campaigns, scenarioBaselines } from "@/lib/demo-data";
import { curveScale, runScenario, scenarioBand } from "@/lib/scenario";
import { cn, fmtCompactCurrency, fmtCurrency, fmtRatio } from "@/lib/format";

const COLORS = ["#3d7bff", "#2ec5b6", "#f2b544", "#ff6b6b"];
const DAY0 = new Date("2026-06-01").getTime();
const SPAN = new Date("2026-12-31").getTime() - DAY0;
const pos = (d: string) => Math.max(0, Math.min(100, ((new Date(d).getTime() - DAY0) / SPAN) * 100));

export default function Planner() {
  const [mult, setMult] = useState<Record<string, number>>(() => Object.fromEntries(scenarioBaselines.map((b) => [b.channel, 1])));
  const rows = useMemo(() => runScenario(scenarioBaselines, mult), [mult]);
  const band = useMemo(() => scenarioBand(scenarioBaselines, mult), [mult]);
  const baseRev = scenarioBaselines.reduce((a, b) => a + b.revenue, 0);
  const baseSpend = scenarioBaselines.reduce((a, b) => a + b.spend, 0);
  const newSpend = rows.reduce((a, r) => a + r.newSpend, 0);
  const curves = useMemo(
    () =>
      Array.from({ length: 41 }, (_, i) => {
        const m = i / 20;
        const pt: Record<string, number> = { m: Math.round(m * 100) };
        scenarioBaselines.forEach((b) => (pt[b.channel] = curveScale(b) * (1 - Math.exp(-(b.spend * m) / b.saturation))));
        return pt;
      }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr]">
        <Panel title="Budget scenario model" subtitle="Drag to reallocate. Deterministic response curves; assumptions listed below." actions={<button onClick={() => setMult(Object.fromEntries(scenarioBaselines.map((b) => [b.channel, 1])))} className="inline-flex items-center gap-1 rounded-md border border-slate-line px-2 py-1 text-[11px] text-mist hover:text-white"><RotateCcw className="h-3 w-3" aria-hidden /> Reset</button>}>
          <Gate rows={6}>
            <div className="space-y-4">
              {rows.map((r, i) => (
                <div key={r.channel}>
                  <div className="flex items-baseline justify-between text-[12.5px]">
                    <label htmlFor={`sc-${r.channel}`} className="flex items-center gap-2 text-white"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />{r.channel}</label>
                    <span className="font-mono text-mist">{fmtCompactCurrency(r.baseSpend)} → <span className="text-white">{fmtCompactCurrency(r.newSpend)}</span> ({Math.round(mult[r.channel] * 100)}%)</span>
                  </div>
                  <input id={`sc-${r.channel}`} type="range" min={0} max={200} step={5} value={Math.round(mult[r.channel] * 100)} onChange={(e) => setMult((m) => ({ ...m, [r.channel]: Number(e.target.value) / 100 }))} className="mt-1.5 w-full accent-[#3d7bff]" />
                  <div className="flex justify-between font-mono text-[10.5px] text-mist">
                    <span>Δ revenue <span className={r.deltaRevenue >= 0 ? "text-teal" : "text-coral-signal"}>{r.deltaRevenue >= 0 ? "+" : "−"}{fmtCompactCurrency(Math.abs(r.deltaRevenue))}</span></span>
                    <span>marginal ROAS {fmtRatio(r.marginalRoas)}</span>
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-electric/40 bg-electric/10 p-3 text-center">
                <div><p className="text-[10.5px] uppercase text-mist">Spend</p><p className="font-mono text-white">{fmtCompactCurrency(newSpend)}</p><p className="font-mono text-[10.5px] text-mist">was {fmtCompactCurrency(baseSpend)}</p></div>
                <div><p className="text-[10.5px] uppercase text-mist">Projected revenue</p><p className="font-mono text-white">{fmtCompactCurrency(band.mid)}</p><p className="font-mono text-[10.5px] text-mist">{fmtCompactCurrency(band.low)} – {fmtCompactCurrency(band.high)}</p></div>
                <div><p className="text-[10.5px] uppercase text-mist">vs baseline</p><p className={cn("font-mono", band.mid >= baseRev ? "text-teal" : "text-coral-signal")}>{band.mid >= baseRev ? "+" : "−"}{fmtCompactCurrency(Math.abs(band.mid - baseRev))}</p><p className="font-mono text-[10.5px] text-mist">90-day window</p></div>
              </div>
            </div>
          </Gate>
        </Panel>
        <Panel title="Response curves" subtitle="Revenue = scale × (1 − e^(−spend ÷ saturation)), calibrated through each channel’s observed point (dot)">
          <Gate chart>
            <div className="h-[340px]">
              <ResponsiveContainer>
                <LineChart data={curves} margin={{ left: -4, right: 10, top: 10 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="m" {...axisProps} tickFormatter={(v) => `${v}%`} />
                  <YAxis {...axisProps} tickFormatter={(v) => fmtCompactCurrency(v)} width={56} />
                  <Tooltip {...growthTooltip} labelFormatter={(v) => `${v}% of current spend`} formatter={(v) => fmtCurrency(Number(v))} />
                  {scenarioBaselines.map((b, i) => <Line key={b.channel} type="monotone" dataKey={b.channel} stroke={COLORS[i]} dot={false} strokeWidth={1.6} />)}
                  {scenarioBaselines.map((b, i) => <ReferenceDot key={b.channel} x={100} y={b.revenue} r={4} fill={COLORS[i]} stroke="#070d1d" />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Gate>
          <ul className="mt-3 grid gap-1.5 text-[11px] text-mist md:grid-cols-2">
            {scenarioBaselines.map((b) => <li key={b.channel}>• {b.channel}: saturation {fmtCompactCurrency(b.saturation)} / 90d <Badge tone="amber">assumption</Badge></li>)}
            <li>• Band = saturation ±30%. Not a causal forecast; validate with holdout tests.</li>
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Campaign timeline" subtitle="Jun – Dec 2026">
          <Gate rows={6}>
            <div className="space-y-2">
              <div className="flex justify-between pl-[34%] font-mono text-[10px] text-mist">{["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => <span key={m}>{m}</span>)}</div>
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="w-[33%] truncate text-[12px] text-white">{c.name}</span>
                  <div className="relative h-5 flex-1 rounded bg-navy-3/60">
                    <div className="absolute inset-y-0 w-px bg-coral-signal/70" style={{ left: `${pos("2026-10-24")}%` }} aria-hidden />
                    <div className={cn("absolute inset-y-0.5 rounded", c.status === "Live" ? "bg-electric/70" : c.status === "Scheduled" ? "bg-teal/50" : c.status === "Paused" ? "bg-mist/30" : "bg-amber-signal/60")} style={{ left: `${pos(c.start)}%`, width: `${Math.max(2, pos(c.end) - pos(c.start))}%` }} title={`${c.start} → ${c.end}`} />
                  </div>
                </div>
              ))}
            </div>
          </Gate>
        </Panel>
        <Panel title={`Draft · ${campaignDraft.name}`} subtitle={`${campaignDraft.dates} · ${fmtCurrency(campaignDraft.budget)}`} actions={<Badge tone="amber">Awaiting approval</Badge>}>
          <table className="w-full text-[12px]">
            <tbody>
              {campaignDraft.kpis.map((k) => <tr key={k.kpi} className="border-b border-slate-line/50"><td className="py-1.5 text-white">{k.kpi}</td><td className="py-1.5 font-mono">{k.target}</td><td className="py-1.5 text-[11px] text-mist">{k.basis}</td></tr>)}
            </tbody>
          </table>
          <p className="mt-3 text-[10.5px] uppercase tracking-wider text-mist">Launch checklist</p>
          <ul className="mt-1 grid gap-1 text-[12px]">
            {campaignDraft.checklist.map((c) => <li key={c.item} className="flex gap-2"><span className={c.done ? "text-teal" : "text-mist"}>{c.done ? "✓" : "○"}</span><span className={c.done ? "text-white" : "text-mist"}>{c.item}</span></li>)}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
