"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Fingerprint, ShieldBan } from "lucide-react";
import { Chip, Gate, Glow, Meter, ScreenHeader, Title } from "../ui";
import { lifecycle, privacyControls, segments } from "@/lib/demo-data";
import { cn, fmtCurrency, fmtPct, fmtSignedPct } from "@/lib/format";

/** Deterministic circle packing along a spiral — good enough for ≤ 10 bubbles. */
function layout(sizes: number[], W: number, H: number) {
  const max = Math.max(...sizes);
  const rs = sizes.map((s) => 26 + Math.sqrt(s / max) * 62);
  const placed: { x: number; y: number; r: number }[] = [];
  rs.forEach((r) => {
    for (let t = 0; t < 2000; t += 1) {
      const a = t * 0.35, d = t * 0.9;
      const x = W / 2 + Math.cos(a) * d, y = H / 2 + Math.sin(a) * d * 0.7;
      if (placed.every((p) => Math.hypot(p.x - x, p.y - y) > p.r + r + 6) && x - r > 4 && x + r < W - 4 && y - r > 4 && y + r < H - 4) {
        placed.push({ x, y, r });
        return;
      }
    }
    placed.push({ x: W / 2, y: H / 2, r });
  });
  return placed;
}

export default function Cohorts() {
  const [sel, setSel] = useState(segments[0].id);
  const pos = useMemo(() => layout(segments.map((s) => s.size), 560, 380), []);
  const s = segments.find((x) => x.id === sel)!;

  return (
    <div>
      <ScreenHeader code="CMD-04 · COHORTS" title="Audience cohorts" sub="Segments built from authorised first-party data. Bubble size = profiles; glow = month-over-month momentum." />
      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Glow>
          <Gate h="h-[380px]">
            <svg viewBox="0 0 560 380" className="h-auto w-full" role="group" aria-label="Segment bubbles">
              <defs>
                <radialGradient id="cb" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#c4b5fd" stopOpacity="0.55" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0.08" /></radialGradient>
                <radialGradient id="cbr" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#f9a8d4" stopOpacity="0.55" /><stop offset="1" stopColor="#f472b6" stopOpacity="0.08" /></radialGradient>
              </defs>
              {segments.map((x, i) => {
                const p = pos[i];
                const active = sel === x.id;
                return (
                  <motion.g key={x.id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08, type: "spring" }} style={{ originX: `${p.x}px`, originY: `${p.y}px` }} className="cursor-pointer" onClick={() => setSel(x.id)} role="button" tabIndex={0} aria-pressed={active} onKeyDown={(e) => e.key === "Enter" && setSel(x.id)}>
                    <circle cx={p.x} cy={p.y} r={p.r} fill={x.health === "at-risk" ? "url(#cbr)" : "url(#cb)"} stroke={active ? "#22d3ee" : x.health === "at-risk" ? "#f472b6" : "#8b5cf6"} strokeWidth={active ? 2 : 1} />
                    {active && <circle cx={p.x} cy={p.y} r={p.r + 6} fill="none" stroke="#22d3ee" strokeOpacity="0.4" strokeDasharray="3 5" className="animate-dash" />}
                    <text x={p.x} y={p.y - 4} textAnchor="middle" fontSize={p.r > 50 ? 13 : 10.5} fill="#fff" fontWeight={600}>{x.name}</text>
                    <text x={p.x} y={p.y + 12} textAnchor="middle" fontSize="10" fill="#9a9ab8" fontFamily="var(--font-mono)">{x.size.toLocaleString()} · {fmtSignedPct(x.growth)}</text>
                  </motion.g>
                );
              })}
            </svg>
          </Gate>
        </Glow>
        <Glow active>
          <div className="flex items-center justify-between"><Chip tone={s.health === "at-risk" ? "magenta" : s.health === "strong" ? "lime" : "cyan"} pulse>{s.health}</Chip><span className="font-mono text-[11px] text-haze">{s.id}</span></div>
          <motion.h2 key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="mt-3 text-3xl font-bold text-white">{s.name}</motion.h2>
          <p className="text-sm text-haze">{s.description}</p>
          <div className="mt-4 rounded-xl border border-rim bg-void/70 p-3 font-mono text-[12px]">
            <p className="text-haze">SELECT profiles WHERE</p>
            {s.rules.map((r, i) => <p key={i} className="pl-4"><span className="text-violet-soft">{i ? "AND " : ""}</span><span className="text-cyan">{r.field}</span> <span className="text-white">{r.op}</span> <span className="text-lime-pulse">{r.value}</span></p>)}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-rim p-2"><p className="font-mono text-[10px] text-haze">LTV</p><p className="font-mono text-white">{s.ltv ? fmtCurrency(s.ltv) : "—"}</p></div>
            <div className="rounded-xl border border-rim p-2"><p className="font-mono text-[10px] text-haze">AOV</p><p className="font-mono text-white">{s.aov ? fmtCurrency(s.aov) : "—"}</p></div>
            <div className="rounded-xl border border-rim p-2"><p className="font-mono text-[10px] text-haze">RETAIN</p><p className="font-mono text-white">{s.retention ? fmtPct(s.retention, 0) : "—"}</p></div>
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <div><div className="mb-1 flex justify-between text-haze"><span>Email consent</span><span className="font-mono text-white">{fmtPct(s.emailConsent, 0)}</span></div><Meter value={s.emailConsent} color="cyan" /></div>
            <div><div className="mb-1 flex justify-between text-haze"><span>SMS consent</span><span className="font-mono text-white">{fmtPct(s.smsConsent, 0)}</span></div><Meter value={s.smsConsent} color="magenta" /></div>
          </div>
        </Glow>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Glow>
          <Title kicker="Lifecycle">Stage flow</Title>
          <div className="flex items-end gap-1.5">
            {lifecycle.map((l, i) => (
              <div key={l.stage} className="flex flex-1 flex-col items-center">
                <motion.div className={cn("w-full rounded-t-lg", i >= 5 ? "bg-gradient-to-t from-magenta/30 to-magenta" : "bg-gradient-to-t from-violet/30 to-cyan")} initial={{ height: 0 }} animate={{ height: `${Math.max(10, Math.sqrt(l.count / 118400) * 150)}px` }} transition={{ delay: i * 0.06, duration: 0.8 }} />
                <p className="mt-2 text-center font-mono text-[9.5px] uppercase text-haze">{l.stage}</p>
                <p className="font-mono text-[10.5px] text-white">{(l.count / 1000).toFixed(1)}k</p>
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] text-haze">Bar height ∝ √count for legibility.</p>
        </Glow>
        <Glow>
          <Title kicker="Guardrails">Privacy & consent</Title>
          <ul className="space-y-2">
            {privacyControls.map((c) => (
              <li key={c.label} className="flex items-start gap-3 rounded-xl border border-rim p-2.5 text-sm">
                {c.on ? <Fingerprint className="h-4 w-4 shrink-0 text-lime-pulse" aria-hidden /> : <ShieldBan className="h-4 w-4 shrink-0 text-haze" aria-hidden />}
                <span className="flex-1"><span className="text-white">{c.label}</span><span className="block text-xs text-haze">{c.detail}</span></span>
                <Chip tone={c.on ? "lime" : "rim"}>{c.on ? "on" : "off"}</Chip>
              </li>
            ))}
          </ul>
        </Glow>
      </div>
    </div>
  );
}
