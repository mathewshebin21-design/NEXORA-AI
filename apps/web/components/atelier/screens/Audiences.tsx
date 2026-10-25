"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Lock, Plus } from "lucide-react";
import { Button, Card, Eyebrow, Gate, PageHeader, Pill, Rule } from "../ui";
import { lifecycle, privacyControls, segments } from "@/lib/demo-data";
import { cn, fmtCurrency, fmtNumber, fmtSignedPct, fmtPct } from "@/lib/format";

function Ring({ value, label }: { value: number; label: string }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-2">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" stroke="#e6dcc8" strokeWidth="3" />
        <motion.circle cx="22" cy="22" r={r} fill="none" stroke="#9c7e45" strokeWidth="3" strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ * (1 - value) }} transform="rotate(-90 22 22)" transition={{ duration: 1 }} />
      </svg>
      <div className="text-xs"><p className="tabular font-medium">{fmtPct(value, 0)}</p><p className="text-stone">{label}</p></div>
    </div>
  );
}

export default function Audiences() {
  const [sel, setSel] = useState(segments[0].id);
  const [controls, setControls] = useState(privacyControls);
  const s = segments.find((x) => x.id === sel)!;
  const maxStage = Math.max(...lifecycle.map((l) => l.count));

  return (
    <div>
      <PageHeader
        eyebrow="Audiences"
        title={<>The people we <span className="italic text-champagne-deep">write for</span></>}
        intro="Segments are defined from first-party, consented data. Sensitive attributes are never inferred."
        actions={<Button><Plus className="h-4 w-4" aria-hidden /> Define a segment</Button>}
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <Gate rows={6} emptyTitle="No segments yet" emptyBody="Connect your commerce platform to build segments from orders and consent.">
          <ul className="space-y-3" aria-label="Segments">
            {segments.map((x) => (
              <li key={x.id}>
                <button aria-pressed={sel === x.id} onClick={() => setSel(x.id)} className={cn("flex w-full items-center justify-between gap-4 rounded-[20px] border px-5 py-4 text-left transition", sel === x.id ? "border-graphite bg-white shadow-sm" : "border-parchment hover:border-champagne")}>
                  <span>
                    <span className="block font-serif text-2xl">{x.name}</span>
                    <span className="text-xs text-stone">{x.description}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-serif text-xl tabular">{fmtNumber(x.size)}</span>
                    <span className={cn("text-xs tabular", x.growth >= 0 ? "text-[#4d5a41]" : "text-rosewood")}>{fmtSignedPct(x.growth)} MoM</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Gate>

        <Card className="p-8 lg:sticky lg:top-40 lg:self-start">
          <div className="flex items-center justify-between">
            <Eyebrow>{s.id} · {s.stage}</Eyebrow>
            <Pill tone={s.health === "strong" ? "sage" : s.health === "at-risk" ? "rose" : "gold"}>{s.health}</Pill>
          </div>
          <motion.h2 key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 font-serif text-5xl tracking-tight">{s.name}</motion.h2>
          <p className="mt-2 text-graphite-soft">{s.description}</p>
          <div className="mt-8 grid grid-cols-3 gap-6 border-y border-parchment py-6">
            <div><p className="text-[11px] uppercase tracking-[0.14em] text-stone">Profiles</p><p className="font-serif text-2xl tabular">{fmtNumber(s.size)}</p></div>
            <div><p className="text-[11px] uppercase tracking-[0.14em] text-stone">Avg. LTV</p><p className="font-serif text-2xl tabular">{s.ltv ? fmtCurrency(s.ltv) : "—"}</p></div>
            <div><p className="text-[11px] uppercase tracking-[0.14em] text-stone">Retention</p><p className="font-serif text-2xl tabular">{s.retention ? fmtPct(s.retention, 0) : "—"}</p></div>
          </div>
          <p className="mt-6 text-[11px] uppercase tracking-[0.16em] text-stone">Definition</p>
          <ul className="mt-3 space-y-2">
            {s.rules.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                {i > 0 && <span className="font-serif italic text-champagne-deep">and</span>}
                <code className="rounded-lg bg-ivory-deep px-2 py-1 font-mono text-xs">{r.field}</code>
                <span className="text-stone">{r.op}</span>
                <code className="rounded-lg bg-ivory-deep px-2 py-1 font-mono text-xs">{r.value}</code>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-6">
            <Ring value={s.emailConsent} label="email consent" />
            <Ring value={s.smsConsent} label="SMS consent" />
          </div>
          <p className="mt-6 text-xs text-stone">LTV = AOV × purchase frequency × gross margin × expected lifespan (see metric definitions). Synthetic.</p>
        </Card>
      </div>

      <Rule label="The lifecycle" />
      <Gate rows={4}>
        <ol className="grid gap-3 md:grid-cols-7">
          {lifecycle.map((l, i) => (
            <li key={l.stage} className="flex flex-col">
              <div className="flex h-40 items-end rounded-2xl bg-ivory-deep p-1.5">
                <motion.div className="w-full rounded-xl" style={{ background: i >= 5 ? "#a0574a" : i >= 3 ? "#9c7e45" : "#c8a96a" }} initial={{ height: 0 }} animate={{ height: `${Math.max(6, (l.count / maxStage) * 100)}%` }} transition={{ duration: 0.9, delay: i * 0.06 }} />
              </div>
              <p className="mt-2 font-serif text-lg">{l.stage}</p>
              <p className="text-xs text-stone tabular">{fmtNumber(l.count)}</p>
            </li>
          ))}
        </ol>
      </Gate>

      <Rule label="Privacy & consent" />
      <ul className="grid gap-4 md:grid-cols-2">
        {controls.map((c, i) => (
          <li key={c.label} className="flex items-start justify-between gap-4 rounded-[20px] border border-parchment bg-white/60 p-5">
            <div>
              <p className="flex items-center gap-2 font-medium"><Lock className="h-4 w-4 text-champagne-deep" aria-hidden /> {c.label}</p>
              <p className="mt-1 text-sm text-graphite-soft">{c.detail}</p>
            </div>
            <button
              role="switch"
              aria-checked={c.on}
              aria-label={c.label}
              disabled={i === 1}
              onClick={() => setControls((xs) => xs.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
              className={cn("relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed", c.on ? "bg-graphite" : "bg-parchment")}
            >
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-ivory transition-all", c.on ? "left-[22px]" : "left-0.5")} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-stone">Sensitive-attribute inference cannot be switched on.</p>
    </div>
  );
}
