"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Clock, DoorOpen, GitBranch, Mail, MessageSquare, Pause, Play, ShieldCheck, ShoppingCart, Trophy } from "lucide-react";
import { Chip, Gate, Glow, NeonButton, ScreenHeader } from "../ui";
import { journey, type JourneyNode } from "@/lib/demo-data";
import { fmtPct } from "@/lib/format";

const ICON: Record<JourneyNode["kind"], typeof Mail> = { trigger: ShoppingCart, check: ShieldCheck, wait: Clock, branch: GitBranch, email: Mail, sms: MessageSquare, ad: Mail, goal: Trophy, exit: DoorOpen };
const COLX = 132, ROWY = 118, OX = 70, OY = 70, NW = 112, NH = 64;
const center = (n: JourneyNode) => ({ x: OX + n.x * COLX, y: OY + n.y * ROWY });

export default function Journeys() {
  const [sel, setSel] = useState<string>("n5");
  const [playing, setPlaying] = useState(true);
  const s = journey.nodes.find((n) => n.id === sel)!;
  const byId = (id: string) => journey.nodes.find((n) => n.id === id)!;
  const W = OX * 2 + 6 * COLX, H = OY * 2 + 2 * ROWY;

  return (
    <div>
      <ScreenHeader code="CMD-05 · JOURNEY MAP" title="Customer journey map" sub={`${journey.name}. Dry-run counts from synthetic profiles — the flow is not active.`} right={<><NeonButton variant="ghost" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>{playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />} {playing ? "Pause flow" : "Animate flow"}</NeonButton><NeonButton>Submit for approval</NeonButton></>} />
      <div className="grid gap-5 2xl:grid-cols-[1fr_320px]">
        <Glow className="overflow-hidden p-0">
          <Gate h="h-[420px]">
            <div className="overflow-x-auto scrollbar-thin" tabIndex={0} role="region" aria-label="Journey graph">
              <svg viewBox={`0 0 ${W} ${H}`} className="h-[420px] min-w-[900px] w-full" role="group" aria-label="Journey node graph">
                <defs>
                  <linearGradient id="edge" x1="0" x2="1"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
                  <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                {journey.edges.map(([a, b], i) => {
                  const p = center(byId(a)), q = center(byId(b));
                  const mx = (p.x + q.x) / 2;
                  const d = `M${p.x + NW / 2} ${p.y} C ${mx} ${p.y}, ${mx} ${q.y}, ${q.x - NW / 2} ${q.y}`;
                  const exit = byId(b).kind === "exit";
                  return (
                    <g key={i}>
                      <path d={d} fill="none" stroke={exit ? "#f472b6" : "url(#edge)"} strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="6 6" className={playing ? "animate-dash" : undefined} />
                      {playing && !exit && (
                        <circle r="3.5" fill="#22d3ee" filter="url(#glow)">
                          <animateMotion dur={`${2.4 + (i % 3) * 0.6}s`} repeatCount="indefinite" path={d} />
                        </circle>
                      )}
                    </g>
                  );
                })}
                {journey.nodes.map((n) => {
                  const c = center(n);
                  const Icon = ICON[n.kind];
                  const active = sel === n.id;
                  return (
                    <g key={n.id} transform={`translate(${c.x - NW / 2} ${c.y - NH / 2})`} onClick={() => setSel(n.id)} className="cursor-pointer" role="button" tabIndex={0} aria-pressed={active} onKeyDown={(e) => e.key === "Enter" && setSel(n.id)}>
                      <rect width={NW} height={NH} rx="14" fill="#12121e" stroke={active ? "#22d3ee" : n.kind === "goal" ? "#a3e635" : n.kind === "exit" ? "#f472b6" : "#2a2a40"} strokeWidth={active ? 2 : 1} filter={active ? "url(#glow)" : undefined} />
                      <foreignObject x="10" y="9" width="18" height="18"><Icon className="h-[16px] w-[16px] text-violet-soft" aria-hidden /></foreignObject>
                      <text x="32" y="22" fontSize="9" fill="#22d3ee" fontFamily="var(--font-mono)" letterSpacing="1">{n.kind.toUpperCase()}</text>
                      <text x="10" y="40" fontSize="10.5" fill="#fff" fontWeight={600}>{(() => { const t = n.title.replace(/^(Email|SMS|Goal|Exit) · /, ""); return t.length > 17 ? t.slice(0, 16) + "…" : t; })()}</text>
                      <text x="10" y="55" fontSize="10" fill="#9a9ab8" fontFamily="var(--font-mono)">{n.entered.toLocaleString()}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </Gate>
        </Glow>
        <AnimatePresence mode="wait">
          <motion.div key={s.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <Glow active>
              <Chip tone="cyan">{s.kind}</Chip>
              <h2 className="mt-3 text-2xl font-bold text-white">{s.title}</h2>
              <p className="text-sm text-haze">{s.detail}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-rim p-3"><p className="font-mono text-[10px] text-haze">ENTERED</p><p className="font-mono text-2xl text-white">{s.entered.toLocaleString()}</p></div>
                <div className="rounded-xl border border-rim p-3"><p className="font-mono text-[10px] text-haze">CONVERTED</p><p className="font-mono text-2xl text-lime-pulse">{s.converted?.toLocaleString() ?? "—"}</p><p className="font-mono text-[10px] text-haze">{s.converted ? fmtPct(s.converted / s.entered) : ""}</p></div>
              </div>
              <ul className="mt-4 space-y-1.5 text-xs text-haze">
                <li>• Outbound: {s.kind === "email" || s.kind === "sms" ? "requires connected ESP + Owner approval" : "none"}</li>
                <li>• Consent: enforced upstream at node n2</li>
                <li>• Idempotency key per profile × step; retries back off exponentially</li>
              </ul>
            </Glow>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
