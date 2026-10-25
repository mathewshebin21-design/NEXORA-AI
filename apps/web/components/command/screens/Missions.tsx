"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Lock, Rocket, Sparkles } from "lucide-react";
import { Chip, Gate, Glow, Meter, NeonButton, ScreenHeader, Title } from "../ui";
import { useAgents } from "../Shell";
import { campaignDraft, campaigns, type CampaignStatus } from "@/lib/demo-data";
import { roas } from "@/lib/metrics";
import { cn, fmtCompactCurrency, fmtCurrency, fmtRatio } from "@/lib/format";

const FILTERS: ("All" | CampaignStatus)[] = ["All", "Live", "Learning", "Scheduled", "Paused"];
const TONE: Record<CampaignStatus, "lime" | "magenta" | "cyan" | "rim" | "violet"> = { Live: "lime", Learning: "magenta", Scheduled: "cyan", Paused: "rim", Draft: "violet" };

export default function Missions() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [gates, setGates] = useState(campaignDraft.checklist);
  const { push } = useAgents();
  const ready = gates.every((g) => g.done);

  return (
    <div>
      <ScreenHeader code="CMD-02 · MISSIONS" title="Campaign missions" sub="Plan, gate and launch. Launch stays locked until every gate is cleared by its owner." />

      <Glow active className="mb-5 overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-violet/30 blur-3xl" aria-hidden />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2"><Chip tone="violet" pulse>Mission in planning</Chip><Chip>{campaignDraft.dates}</Chip></div>
            <h2 className="mt-3 text-3xl font-bold text-white">{campaignDraft.name}</h2>
            <p className="text-haze">{campaignDraft.objective} · {fmtCurrency(campaignDraft.budget)}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {campaignDraft.channelMix.map((m, i) => (
                <motion.div key={m.channel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-xl border border-rim bg-carbon/70 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-haze">{m.channel}</p>
                  <p className="mt-1 font-mono text-lg text-white">{Math.round(m.share * 100)}%</p>
                  <p className="font-mono text-[10.5px] text-cyan">{fmtCompactCurrency(m.share * campaignDraft.budget)}</p>
                </motion.div>
              ))}
            </div>
            <ul className="mt-5 space-y-1.5">
              {campaignDraft.kpis.map((k) => <li key={k.kpi} className="flex flex-wrap gap-x-3 text-sm"><span className="text-white">{k.kpi}</span><span className="font-mono text-cyan">{k.target}</span><span className="text-xs text-haze">{k.basis}</span></li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-rim bg-void/60 p-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-violet-soft">Launch gates</p>
            <ul className="mt-3 space-y-2">
              {gates.map((g, i) => (
                <li key={g.item}>
                  <button onClick={() => { setGates((xs) => xs.map((x, j) => (j === i ? { ...x, done: !x.done } : x))); push(`human.gate  "${g.item}" → ${g.done ? "reopened" : "cleared"}`); }} aria-pressed={g.done} className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition", g.done ? "border-lime-pulse/40 bg-lime-pulse/5 text-white" : "border-rim text-haze hover:border-violet/50")}>
                    <span className={cn("grid h-5 w-5 place-items-center rounded-md border", g.done ? "border-lime-pulse bg-lime-pulse/20" : "border-rim")}>{g.done && <Check className="h-3.5 w-3.5 text-lime-pulse" aria-hidden />}</span>
                    {g.item}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4"><Meter value={gates.filter((g) => g.done).length / gates.length} color="lime" /></div>
            <NeonButton className="mt-4 w-full" disabled={!ready} onClick={() => push("ops.agent  launch package prepared → awaiting Owner sign-off (not published)")}>
              {ready ? <><Rocket className="h-4 w-4" aria-hidden /> Prepare launch package</> : <><Lock className="h-4 w-4" aria-hidden /> {gates.filter((g) => !g.done).length} gates open</>}
            </NeonButton>
            <p className="mt-2 text-center font-mono text-[10px] text-haze">Preparing ≠ publishing. Publishing requires Owner approval and connected, authorised platforms.</p>
          </div>
        </div>
      </Glow>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Mission status filter">
        {FILTERS.map((f) => <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={cn("rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider", filter === f ? "border-cyan bg-cyan/10 text-cyan" : "border-rim text-haze hover:text-white")}>{f}</button>)}
      </div>
      <Gate h="h-64">
        <motion.ul layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {campaigns.filter((c) => filter === "All" || c.status === filter).map((c) => (
              <motion.li layout key={c.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} whileHover={{ y: -4 }}>
                <Glow className="h-full">
                  <div className="flex items-center justify-between"><Chip tone={TONE[c.status]} pulse={c.status === "Live" || c.status === "Learning"}>{c.status}</Chip><span className="font-mono text-[10.5px] text-haze">{c.id}</span></div>
                  <p className="mt-3 text-lg font-semibold text-white">{c.name}</p>
                  <p className="font-mono text-[11px] text-haze">{c.platform} · {c.owner}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div><p className="font-mono text-[10px] text-haze">SPEND</p><p className="font-mono text-white">{fmtCompactCurrency(c.spend)}</p></div>
                    <div><p className="font-mono text-[10px] text-haze">ROAS</p><p className="font-mono text-cyan">{c.spend ? fmtRatio(roas(c.revenue, c.spend)) : "—"}</p></div>
                    <div><p className="font-mono text-[10px] text-haze">ORDERS</p><p className="font-mono text-white">{c.measuredConversions.toLocaleString()}</p></div>
                  </div>
                  <div className="mt-4"><Meter value={c.budget ? c.spend / c.budget : 0} color={c.status === "Learning" ? "magenta" : "violet"} /><p className="mt-1 font-mono text-[10px] text-haze">{c.start} → {c.end}</p></div>
                </Glow>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </Gate>
      <p className="mt-4 flex items-center gap-2 text-xs text-haze"><Sparkles className="h-3.5 w-3.5 text-violet" aria-hidden /> Mission builder generates strategy drafts through a pluggable AI provider (not connected in this preview).</p>
    </div>
  );
}
