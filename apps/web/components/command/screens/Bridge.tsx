"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Chip, Gate, Glow, Meter, ScreenHeader, Title } from "../ui";
import { useAgents } from "../Shell";
import { campaigns, liveCampaigns, recommendations } from "@/lib/demo-data";
import { roas, sumPerformance } from "@/lib/metrics";
import { fmtCompactCurrency, fmtRatio } from "@/lib/format";
import { COMMAND_BASE } from "@/lib/screens";

const STAGES = [
  { k: "Research", n: 7, slug: "recon" },
  { k: "Brief", n: 2, slug: "missions" },
  { k: "Create", n: 6, slug: "forge" },
  { k: "Approve", n: 3, slug: "forge" },
  { k: "Launch", n: 1, slug: "missions" },
  { k: "Optimize", n: 5, slug: "copilot" },
];

function Pipeline() {
  return (
    <div className="relative">
      <svg className="absolute left-0 top-[34px] hidden h-2 w-full md:block" preserveAspectRatio="none" viewBox="0 0 100 2" aria-hidden>
        <line x1="4" y1="1" x2="96" y2="1" stroke="url(#pl)" strokeWidth="0.4" strokeDasharray="1.2 1.2" className="animate-dash" />
        <defs><linearGradient id="pl"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
      </svg>
      {/* travelling pulses */}
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="absolute top-[31px] hidden h-2 w-2 rounded-full bg-cyan shadow-[0_0_12px_2px_rgba(34,211,238,0.8)] md:block" initial={{ left: "4%" }} animate={{ left: "96%" }} transition={{ duration: 6, repeat: Infinity, delay: i * 2, ease: "linear" }} aria-hidden />
      ))}
      <ol className="relative grid grid-cols-3 gap-3 md:grid-cols-6">
        {STAGES.map((s, i) => (
          <motion.li key={s.k} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
            <Link href={`${COMMAND_BASE}/${s.slug}`} className="group flex flex-col items-center text-center">
              <span className="relative grid h-[68px] w-[68px] place-items-center rounded-2xl border border-rim bg-carbon-2 transition group-hover:border-violet/70 group-hover:shadow-[0_0_30px_-6px_rgba(139,92,246,0.9)]">
                <span className="font-mono text-2xl font-semibold text-white">{s.n}</span>
                {s.k === "Approve" && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-magenta shadow-[0_0_12px_rgba(244,114,182,0.9)]" />}
              </span>
              <span className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-haze group-hover:text-white">{s.k}</span>
            </Link>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

function RadarViz() {
  const live = liveCampaigns;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Campaign radar: distance from centre reflects measured ROAS rank">
        {[90, 65, 40, 15].map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#2a2a40" strokeWidth="0.6" />)}
        <line x1="10" y1="100" x2="190" y2="100" stroke="#2a2a40" strokeWidth="0.5" />
        <line x1="100" y1="10" x2="100" y2="190" stroke="#2a2a40" strokeWidth="0.5" />
        <motion.g style={{ originX: "100px", originY: "100px" }} animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
          <path d="M100 100 L100 10 A90 90 0 0 1 163.6 36.4 Z" fill="url(#sweep)" />
        </motion.g>
        <defs>
          <radialGradient id="sweep" cx="0" cy="1" r="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity="0.5" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></radialGradient>
        </defs>
        {[...live].sort((a, b) => (roas(b.revenue, b.spend) ?? 0) - (roas(a.revenue, a.spend) ?? 0)).map((c, i) => {
          const angle = (i / live.length) * Math.PI * 2 - Math.PI / 2;
          const r = 22 + i * 10;
          return (
            <g key={c.id}>
              <circle cx={100 + Math.cos(angle) * r} cy={100 + Math.sin(angle) * r} r={3 + Math.sqrt(c.spend) / 60} fill={c.status === "Live" ? "#22d3ee" : "#f472b6"} opacity="0.85">
                <animate attributeName="opacity" values="0.5;1;0.5" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
              <title>{`${c.name} — ${fmtRatio(roas(c.revenue, c.spend))}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Bridge() {
  const t = sumPerformance(liveCampaigns);
  const { agents } = useAgents();
  const approvals = agents.filter((a) => a.needsApproval).length;
  const pacing = t.spend / liveCampaigns.reduce((a, c) => a + c.budget, 0);
  return (
    <div>
      <ScreenHeader code="CMD-00 · BRIDGE" title="Mission control" sub="Every campaign is a mission; every agent proposes, people decide. Live view of the Lumen & Oak workspace." right={<Chip tone="magenta" pulse>{approvals} approvals waiting</Chip>} />

      <Glow className="mb-5">
        <Title kicker="Operations pipeline" right={<span className="font-mono text-[10.5px] text-haze">24 work items · synthetic</span>}>From signal to optimization</Title>
        <Pipeline />
      </Glow>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Glow active>
          <Title kicker="Campaign radar">Return on spend, ranked</Title>
          <Gate h="h-[300px]"><RadarViz /></Gate>
          <div className="mt-2 flex justify-center gap-3 font-mono text-[10px] text-haze"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan" />live</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-magenta" />learning / paused</span><span>inner ring = higher ROAS</span></div>
        </Glow>
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            ["Measured revenue", fmtCompactCurrency(t.revenue), null, "Σ matched order revenue"],
            ["Media deployed", fmtCompactCurrency(t.spend), pacing, `${Math.round(pacing * 100)}% of live budgets`],
            ["Measured ROAS", fmtRatio(roas(t.revenue, t.spend)), null, "revenue ÷ spend"],
            ["Orders matched", t.conversions.toLocaleString(), null, "commerce.orders ⋈ touchpoints"],
          ].map(([k, v, m, note], i) => (
            <Glow key={k as string} className="flex flex-col">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-haze">{k as string}</p>
              <Gate h="h-16">
                <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }} className="mt-3 font-mono text-4xl font-semibold text-white">{v as string}</motion.p>
                {m !== null && <div className="mt-4"><Meter value={m as number} color="cyan" /></div>}
                <p className="mt-2 font-mono text-[10px] text-haze">{note as string}</p>
              </Gate>
            </Glow>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Glow>
          <Title kicker="Active missions" right={<Link href={`${COMMAND_BASE}/missions`} className="font-mono text-[11px] text-cyan hover:underline">ALL →</Link>}>Running now</Title>
          <Gate>
            <ul className="space-y-2">
              {campaigns.filter((c) => c.status !== "Paused").slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-xl border border-rim bg-carbon/60 p-3">
                  <span className={c.status === "Live" ? "h-2 w-2 rounded-full bg-lime-pulse shadow-[0_0_10px_rgba(163,230,53,0.9)]" : c.status === "Learning" ? "h-2 w-2 animate-pulse rounded-full bg-magenta" : "h-2 w-2 rounded-full bg-cyan"} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm text-white">{c.name}</p><p className="font-mono text-[10.5px] text-haze">{c.id} · {c.channel} · {c.status}</p></div>
                  <div className="hidden w-32 sm:block"><Meter value={c.budget ? c.spend / c.budget : 0} color="cyan" /><p className="mt-1 text-right font-mono text-[10px] text-haze">{Math.round((c.spend / c.budget) * 100)}% budget</p></div>
                  <span className="w-16 text-right font-mono text-sm text-white">{c.spend ? fmtRatio(roas(c.revenue, c.spend)) : "—"}</span>
                </li>
              ))}
            </ul>
          </Gate>
        </Glow>
        <Glow>
          <Title kicker="Copilot proposals">Awaiting a decision</Title>
          <Gate>
            <ul className="space-y-2">
              {recommendations.filter((r) => r.requiresApproval).slice(0, 3).map((r) => (
                <li key={r.id}>
                  <Link href={`${COMMAND_BASE}/copilot`} className="group block rounded-xl border border-rim p-3 hover:border-violet/60">
                    <div className="flex items-center justify-between"><Chip tone="violet">{r.kind}</Chip><ArrowUpRight className="h-4 w-4 text-haze group-hover:text-white" aria-hidden /></div>
                    <p className="mt-2 text-sm text-white">{r.title}</p>
                    <p className="mt-1 font-mono text-[10.5px] text-haze">{r.evidence.map((e) => e.ref).join(" · ")}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Gate>
        </Glow>
      </div>
    </div>
  );
}
