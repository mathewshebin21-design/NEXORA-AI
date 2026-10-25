"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Chip, Gate, Glow, NeonButton, ScreenHeader, Title, cAxis, commandTooltip } from "../ui";
import { daily, liveCampaigns } from "@/lib/demo-data";
import { conversionRate, cpa, ctr, roas } from "@/lib/metrics";
import { fmtCompactCurrency, fmtCurrency, fmtPct, fmtRatio } from "@/lib/format";

/** Flags days whose revenue deviates > 2σ from the trailing 14-day mean. */
function anomalies(points: typeof daily) {
  return points
    .map((p, i) => {
      if (i < 14) return null;
      const w = points.slice(i - 14, i).map((x) => x.revenue);
      const mean = w.reduce((a, b) => a + b, 0) / w.length;
      const sd = Math.sqrt(w.reduce((a, b) => a + (b - mean) ** 2, 0) / w.length);
      const z = (p.revenue - mean) / sd;
      return Math.abs(z) > 2 ? { ...p, z } : null;
    })
    .filter(Boolean) as (DailyZ)[];
}
type DailyZ = (typeof daily)[number] & { z: number };

export default function Telemetry() {
  const [n, setN] = useState(30);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing || n >= daily.length) return;
    const t = setTimeout(() => setN((x) => x + 1), 140);
    return () => clearTimeout(t);
  }, [n, playing]);
  const shown = daily.slice(0, n);
  const flags = useMemo(() => anomalies(daily).filter((a) => shown.some((s) => s.date === a.date)), [shown]);
  const last = shown[shown.length - 1];

  return (
    <div>
      <ScreenHeader code="CMD-06 · TELEMETRY" title="Performance telemetry" sub="Replay of 90 days of synthetic daily data with automatic anomaly flags (|z| > 2 vs trailing 14 days)." right={<><NeonButton variant="ghost" onClick={() => setPlaying((p) => !p)}>{playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}{playing ? "Pause" : "Play"}</NeonButton><NeonButton variant="ghost" onClick={() => { setN(14); setPlaying(true); }}><RotateCcw className="h-4 w-4" aria-hidden /> Replay</NeonButton></>} />
      <Glow active={playing && n < daily.length} className="mb-5">
        <Title kicker={`T+${n} · ${last.label}`} right={<div className="flex gap-2"><Chip tone="cyan" pulse={playing}>replay</Chip><Chip tone="magenta">{flags.length} anomalies</Chip></div>}>Revenue stream</Title>
        <Gate h="h-[300px]">
          <div className="h-[300px]">
            <ResponsiveContainer>
              <AreaChart data={shown} margin={{ left: -4, right: 8, top: 10 }}>
                <defs>
                  <linearGradient id="tel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity={0.6} /><stop offset="1" stopColor="#22d3ee" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="#1a1a2a" vertical={false} />
                <XAxis dataKey="label" {...cAxis} interval={Math.max(1, Math.floor(n / 8))} />
                <YAxis {...cAxis} tickFormatter={(v) => fmtCompactCurrency(v)} width={54} domain={[0, 20000]} />
                <Tooltip {...commandTooltip} formatter={(v) => fmtCurrency(Number(v))} />
                <Area type="monotone" dataKey="revenue" stroke="#c4b5fd" strokeWidth={2} fill="url(#tel)" isAnimationActive={false} />
                {flags.map((f) => <ReferenceDot key={f.date} x={f.label} y={f.revenue} r={6} fill="#f472b6" stroke="#05050a" strokeWidth={2} />)}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Gate>
        {flags.length > 0 && <p className="mt-2 font-mono text-[11px] text-magenta">Latest flag: {flags[flags.length - 1].label} · z = {flags[flags.length - 1].z.toFixed(2)} · investigate before acting — anomalies are not explanations.</p>}
      </Glow>
      <Gate h="h-56">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {liveCampaigns.slice(0, 8).map((c) => {
            const r = roas(c.revenue, c.spend) ?? 0;
            return (
              <Glow key={c.id} className="p-4">
                <div className="flex items-center justify-between"><span className="font-mono text-[10px] text-haze">{c.id}</span><span className={r >= 3 ? "h-2 w-2 rounded-full bg-lime-pulse shadow-[0_0_8px_#a3e635]" : r >= 1.5 ? "h-2 w-2 rounded-full bg-cyan" : "h-2 w-2 animate-pulse rounded-full bg-magenta"} /></div>
                <p className="mt-1 truncate text-sm font-semibold text-white">{c.name}</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
                  <dt className="text-haze">ROAS</dt><dd className="text-right text-white">{fmtRatio(r)}</dd>
                  <dt className="text-haze">CPA</dt><dd className="text-right text-white">{fmtCurrency(cpa(c.spend, c.measuredConversions), 2)}</dd>
                  <dt className="text-haze">CTR</dt><dd className="text-right text-white">{fmtPct(ctr(c.clicks, c.impressions), 2)}</dd>
                  <dt className="text-haze">CVR</dt><dd className="text-right text-white">{fmtPct(conversionRate(c.measuredConversions, c.clicks), 2)}</dd>
                </dl>
              </Glow>
            );
          })}
        </div>
      </Gate>
    </div>
  );
}
