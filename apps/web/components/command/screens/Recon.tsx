"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, Loader, Play, Terminal } from "lucide-react";
import { Chip, Gate, Glow, NeonButton, ScreenHeader, Title } from "../ui";
import { useAgents } from "../Shell";
import { findings, searchQueries, type Finding } from "@/lib/demo-data";
import { cn, fmtPct } from "@/lib/format";
import { ctr } from "@/lib/metrics";

const STEPS = [
  "plan: decompose question → 3 sub-queries",
  "retrieve: search_console_export.csv (synthetic) · 6 queries",
  "retrieve: review_corpus (synthetic) · 1,284 docs",
  "retrieve: competitor_snapshots (synthetic) · 3 sites",
  "classify: tag each claim as evidence | assumption | recommendation",
  "verify: drop claims without a source; downgrade to assumption",
  "compose: 7 findings, 4 evidenced",
];
const BASIS_TONE: Record<Finding["basis"], "cyan" | "magenta" | "violet"> = { Evidence: "cyan", Assumption: "magenta", Recommendation: "violet" };

function EvidenceGraph({ sel, onSel }: { sel: string; onSel: (id: string) => void }) {
  const sources = Array.from(new Set(findings.map((f) => f.source.split(" · ")[0])));
  const W = 520, H = 340;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="group" aria-label="Evidence graph linking findings to their sources">
      {findings.map((f, i) => {
        const fy = 30 + i * ((H - 60) / (findings.length - 1));
        const si = sources.indexOf(f.source.split(" · ")[0]);
        const sy = 30 + si * ((H - 60) / Math.max(1, sources.length - 1));
        const active = sel === f.id;
        return (
          <g key={f.id}>
            <path d={`M140 ${fy} C 260 ${fy}, 260 ${sy}, 380 ${sy}`} stroke={active ? "#22d3ee" : f.basis === "Evidence" ? "#8b5cf6" : "#f472b6"} strokeOpacity={active ? 1 : 0.35} strokeWidth={active ? 2 : 1} fill="none" strokeDasharray={f.basis === "Evidence" ? undefined : "4 4"} className={f.basis === "Evidence" ? undefined : "animate-dash"} />
            <g onClick={() => onSel(f.id)} className="cursor-pointer" role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSel(f.id)}>
              <circle cx="130" cy={fy} r={active ? 7 : 5} fill={active ? "#22d3ee" : "#12121e"} stroke="#8b5cf6" />
              <text x="118" y={fy + 4} textAnchor="end" fontSize="10" fill={active ? "#fff" : "#9a9ab8"} fontFamily="var(--font-mono)">{f.id} · {f.area.split(" ")[0]}</text>
            </g>
          </g>
        );
      })}
      {sources.map((s, i) => {
        const sy = 30 + i * ((H - 60) / Math.max(1, sources.length - 1));
        return (
          <g key={s}>
            <rect x="380" y={sy - 9} width="10" height="18" rx="3" fill="#8b5cf6" opacity="0.6" />
            <text x="396" y={sy + 4} fontSize="9.5" fill="#c4b5fd" fontFamily="var(--font-mono)">{s.length > 22 ? s.slice(0, 21) + "…" : s}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Recon() {
  const [run, setRun] = useState(-1);
  const [sel, setSel] = useState(findings[0].id);
  const { push } = useAgents();
  const f = findings.find((x) => x.id === sel)!;

  useEffect(() => {
    if (run < 0 || run >= STEPS.length) return;
    const t = setTimeout(() => setRun((r) => r + 1), 520);
    return () => clearTimeout(t);
  }, [run]);
  useEffect(() => { if (run === STEPS.length) push("research.agent  run complete → 7 findings (replay)"); }, [run, push]);

  return (
    <div>
      <ScreenHeader code="CMD-01 · RECON" title="Market reconnaissance" sub="Research agents work only from connected or uploaded sources. Unsourced claims are downgraded to assumptions automatically." right={<NeonButton onClick={() => setRun(0)} disabled={run >= 0 && run < STEPS.length}><Play className="h-4 w-4" aria-hidden /> Replay research run</NeonButton>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_1.25fr]">
        <Glow active={run >= 0 && run < STEPS.length}>
          <Title kicker="Agent trace" right={<Chip tone="magenta">replay · no LLM</Chip>}>“What’s driving bedding demand this season?”</Title>
          <div className="rounded-xl border border-rim bg-void/80 p-4 font-mono text-[11.5px]">
            <p className="flex items-center gap-2 text-haze"><Terminal className="h-3.5 w-3.5" aria-hidden /> research.agent@lumen-oak</p>
            <ul className="mt-3 space-y-1.5" aria-live="polite">
              {STEPS.map((s, i) => (
                <li key={s} className={cn("flex items-start gap-2 transition", run === -1 ? "text-haze/60" : i < run ? "text-white" : i === run ? "text-cyan" : "text-haze/30")}>
                  {run > i || run === -1 ? <CircleCheck className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", run === -1 ? "text-haze/40" : "text-lime-pulse")} aria-hidden /> : i === run ? <Loader className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-rim" />}
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-haze">Every step is logged to the audit trail with inputs and outputs. Paid data providers (e.g. keyword volume APIs) are not connected.</p>
        </Glow>
        <Glow>
          <Title kicker="Evidence graph" right={<div className="flex gap-1.5"><Chip tone="cyan">evidence</Chip><Chip tone="magenta">assumption</Chip></div>}>Claims ↔ sources</Title>
          <Gate h="h-[340px]"><div className="h-[340px]"><EvidenceGraph sel={sel} onSel={setSel} /></div></Gate>
        </Glow>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <AnimatePresence mode="wait">
          <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Glow active>
              <div className="flex items-center gap-2"><Chip tone={BASIS_TONE[f.basis]}>{f.basis}</Chip><span className="font-mono text-[11px] text-haze">{f.id} · {f.area}</span></div>
              <p className="mt-3 text-xl font-semibold text-white">{f.claim}</p>
              <p className="mt-2 text-sm text-haze">{f.detail}</p>
              <p className="mt-4 font-mono text-[11px] text-cyan">SOURCE › {f.source}</p>
            </Glow>
          </motion.div>
        </AnimatePresence>
        <Glow>
          <Title kicker="Search signal">Top queries</Title>
          <Gate>
            <ul className="space-y-2">
              {searchQueries.slice(0, 5).map((q) => (
                <li key={q.query} className="grid grid-cols-[1fr_auto] gap-2 text-sm">
                  <span className="truncate text-white">{q.query}</span>
                  <span className="font-mono text-xs text-haze">{q.clicks.toLocaleString()} clk · {fmtPct(ctr(q.clicks, q.impressions))}</span>
                  <div className="col-span-2 h-1 rounded bg-rim"><div className="h-1 rounded bg-gradient-to-r from-violet to-cyan" style={{ width: `${(q.clicks / 3412) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </Gate>
        </Glow>
      </div>
    </div>
  );
}
