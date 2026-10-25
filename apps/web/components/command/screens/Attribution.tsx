"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Chip, Gate, Glow, ScreenHeader, Title } from "../ui";
import { MODEL_DESCRIPTIONS, MODEL_LABELS, attribute, reconcile, type AttributionModel } from "@/lib/attribution";
import { CHANNELS, channelColors, conversionPaths } from "@/lib/demo-data";
import { cn, fmtCompactCurrency, fmtNumber, fmtPct } from "@/lib/format";

const MODELS = Object.keys(MODEL_LABELS) as AttributionModel[];

export default function Attribution() {
  const [model, setModel] = useState<AttributionModel>("time_decay");
  const credits = useMemo(() => attribute(conversionPaths, model), [model]);
  const first = useMemo(() => attribute(conversionPaths, "first_touch"), []);
  const last = useMemo(() => attribute(conversionPaths, "last_touch"), []);
  const rec = reconcile(conversionPaths, credits);
  const total = rec.measuredRevenue;
  const W = 760, H = 380, LX = 170, RX = 600;
  let acc = 0;
  const ribbons = CHANNELS.map((ch, i) => {
    const v = credits.find((c) => c.channel === ch)?.revenue ?? 0;
    const h = (v / total) * (H - 80);
    const y0 = 30 + i * ((H - 60) / CHANNELS.length);
    const ry = 40 + acc;
    acc += h;
    return { ch, v, h, y0, ry };
  });

  return (
    <div>
      <ScreenHeader code="CMD-07 · ATTRIBUTION FLOW" title="Revenue attribution flow" sub="Watch credit re-route as you switch models. Every model allocates the same measured total — it moves credit, not truth." />
      <div className="mb-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Attribution model">
        {MODELS.map((m) => (
          <button key={m} role="radio" aria-checked={model === m} onClick={() => setModel(m)} className={cn("rounded-xl border px-3 py-1.5 text-sm transition", model === m ? "border-violet bg-violet/15 text-white shadow-[0_0_20px_-6px_rgba(139,92,246,0.9)]" : "border-rim text-haze hover:text-white")}>{MODEL_LABELS[m]}</button>
        ))}
      </div>
      <Glow active className="mb-5">
        <Title kicker={MODEL_DESCRIPTIONS[model]} right={<Chip tone={rec.balanced ? "lime" : "magenta"} pulse>{rec.balanced ? "reconciled" : "mismatch"}</Chip>}>{fmtNumber(rec.measuredConversions)} paths → {fmtCompactCurrency(total)}</Title>
        <Gate h="h-[380px]">
          <div className="overflow-x-auto scrollbar-thin" tabIndex={0} role="region" aria-label="Attribution flow">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-[380px] min-w-[680px] w-full" role="img" aria-label={`Attribution flow under ${MODEL_LABELS[model]}`}>
              {ribbons.map((r) => {
                const col = channelColors[r.ch].c;
                const mid = (LX + RX) / 2;
                const d = `M${LX} ${r.y0 + 14} C ${mid} ${r.y0 + 14}, ${mid} ${r.ry + r.h / 2}, ${RX} ${r.ry + r.h / 2}`;
                return (
                  <g key={r.ch}>
                    <motion.path d={d} fill="none" stroke={col} strokeOpacity={0.45} strokeLinecap="butt" animate={{ strokeWidth: Math.max(1, r.h), d }} transition={{ duration: 0.8, ease: "easeInOut" }} />
                    <circle cx={LX} cy={r.y0 + 14} r="6" fill={col} />
                    <text x={LX - 14} y={r.y0 + 11} textAnchor="end" fontSize="12" fill="#fff" fontWeight={600}>{r.ch}</text>
                    <text x={LX - 14} y={r.y0 + 26} textAnchor="end" fontSize="10.5" fill="#9a9ab8" fontFamily="var(--font-mono)">{fmtCompactCurrency(r.v)} · {fmtPct(r.v / total, 0)}</text>
                  </g>
                );
              })}
              <rect x={RX} y="40" width="14" height={H - 80} rx="4" fill="url(#rv)" />
              <defs><linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
              <text x={RX + 24} y={H / 2 - 6} fontSize="12" fill="#fff" fontWeight={600}>Measured revenue</text>
              <text x={RX + 24} y={H / 2 + 12} fontSize="11" fill="#22d3ee" fontFamily="var(--font-mono)">{fmtCompactCurrency(total)}</text>
            </svg>
          </div>
        </Gate>
      </Glow>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Glow>
          <Title kicker="Model sensitivity">First touch vs last touch</Title>
          <ul className="space-y-3">
            {CHANNELS.map((ch) => {
              const f = first.find((c) => c.channel === ch)?.revenue ?? 0;
              const l = last.find((c) => c.channel === ch)?.revenue ?? 0;
              const diff = (l - f) / total;
              return (
                <li key={ch} className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-sm">
                  <span className="text-white">{ch}</span>
                  <div className="relative h-2 rounded bg-rim">
                    <span className="absolute left-1/2 top-[-3px] h-[14px] w-px bg-haze" />
                    <motion.span className={cn("absolute top-0 h-2 rounded", diff >= 0 ? "left-1/2 bg-cyan" : "right-1/2 bg-magenta")} initial={{ width: 0 }} animate={{ width: `${Math.min(50, Math.abs(diff) * 250)}%` }} />
                  </div>
                  <span className={cn("text-right font-mono text-xs", diff >= 0 ? "text-cyan" : "text-magenta")}>{diff >= 0 ? "+" : "−"}{fmtPct(Math.abs(diff))}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 font-mono text-[10.5px] text-haze">Right = channel gains share under last touch (closer), left = under first touch (opener).</p>
        </Glow>
        <Glow>
          <Title kicker="Limits">What this cannot tell you</Title>
          <ul className="space-y-2 text-sm text-haze">
            <li>› Whether any channel <span className="text-white">caused</span> a sale. Use holdout or geo-lift tests.</li>
            <li>› Impression-only exposure (views without clicks) — not observed.</li>
            <li>› Cross-device paths without login — split, undercounting multi-touch.</li>
            <li>› Platform-reported conversions — kept separate; never summed here.</li>
          </ul>
        </Glow>
      </div>
    </div>
  );
}
