"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Bot, Boxes, ChevronRight, Command as CmdIcon, Crosshair, FlaskConical, Gauge, Hexagon, Network, Orbit, PanelRightClose, PanelRightOpen,
  Radar, Rocket, Send, Server, Shapes, ShieldCheck, Waypoints, X,
} from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { COMMAND_BASE, commandScreens } from "@/lib/screens";
import { DEMO_NOTICE, agentActivity } from "@/lib/demo-data";
import { DATA_STATES, PreviewStateProvider, usePreviewState } from "@/lib/preview-state";
import { cn } from "@/lib/format";
import { Chip, Meter } from "./ui";

const ICONS: Record<string, typeof Radar> = {
  bridge: Orbit, recon: Radar, missions: Rocket, forge: FlaskConical, cohorts: Boxes, journeys: Waypoints,
  telemetry: Gauge, attribution: Network, copilot: Bot, dispatch: Send, systems: Server,
};

/* -------------------------------------------------------- Agent context */
export type Agent = (typeof agentActivity)[number] & { id: string };
type AgentCtx = { agents: Agent[]; approve: (id: string) => void; reject: (id: string) => void; log: string[]; push: (s: string) => void };
const Ctx = createContext<AgentCtx | null>(null);
export const useAgents = () => useContext(Ctx)!;

function AgentProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>(agentActivity.map((a, i) => ({ ...a, id: `AG-${i + 1}` })));
  const [log, setLog] = useState<string[]>(["10:42:07  creative.agent  awaiting approval → AST-504 headline variants", "10:41:55  analyst.agent   reconciliation complete → CMP-1041 gap 28.7%", "10:40:12  research.agent  ingest 1,284 reviews (synthetic corpus)"]);
  const push = useCallback((s: string) => setLog((l) => [`${new Date().toISOString().slice(11, 19)}  ${s}`, ...l].slice(0, 30)), []);
  // Simulated progress for the running agent — UI only, clearly labelled.
  useEffect(() => {
    const t = setInterval(() => {
      setAgents((xs) => xs.map((a) => (a.status === "running" ? { ...a, progress: a.progress >= 0.98 ? 0.35 : a.progress + 0.02 } : a)));
    }, 900);
    return () => clearInterval(t);
  }, []);
  const approve = (id: string) => {
    setAgents((xs) => xs.map((a) => (a.id === id ? { ...a, status: "done", needsApproval: false } : a)));
    push(`human.approval  ${id} approved → draft saved, nothing published`);
  };
  const reject = (id: string) => {
    setAgents((xs) => xs.map((a) => (a.id === id ? { ...a, status: "queued", needsApproval: false, progress: 0 } : a)));
    push(`human.approval  ${id} returned for rework`);
  };
  return <Ctx.Provider value={{ agents, approve, reject, log, push }}>{children}</Ctx.Provider>;
}

function AgentDock({ onClose }: { onClose?: () => void }) {
  const { agents, approve, reject, log } = useAgents();
  const { state, setState } = usePreviewState();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-rim px-4 py-3">
        <div className="flex items-center gap-2"><Hexagon className="h-4 w-4 text-violet" aria-hidden /><p className="font-grotesk text-sm font-semibold text-white">Agent dock</p></div>
        {onClose && <button onClick={onClose} aria-label="Close agent dock" className="grid h-8 w-8 place-items-center rounded-lg text-haze hover:text-white"><X className="h-4 w-4" aria-hidden /></button>}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin">
        {agents.map((a) => (
          <motion.div layout key={a.id} className={cn("rounded-xl border p-3", a.needsApproval ? "border-magenta/50 bg-magenta/5" : "border-rim bg-carbon-2/60")}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-cyan">{a.agent}</span>
              <Chip tone={a.status === "running" ? "violet" : a.status === "waiting" ? "magenta" : a.status === "done" ? "lime" : "rim"} pulse={a.status === "running" || a.status === "waiting"}>{a.needsApproval ? "approval" : a.status}</Chip>
            </div>
            <p className="mt-1.5 text-[12.5px] text-white">{a.task}</p>
            {a.status === "running" && <div className="mt-2"><Meter value={a.progress} /><p className="mt-1 font-mono text-[10px] text-haze">{Math.round(a.progress * 100)}% · simulated</p></div>}
            {a.needsApproval && (
              <div className="mt-2 flex gap-1.5">
                <button onClick={() => approve(a.id)} className="flex-1 rounded-lg bg-violet/80 py-1 text-[11.5px] font-medium text-white hover:bg-violet">Approve draft</button>
                <button onClick={() => reject(a.id)} className="flex-1 rounded-lg border border-rim py-1 text-[11.5px] text-haze hover:text-white">Return</button>
              </div>
            )}
          </motion.div>
        ))}
        <div className="rounded-xl border border-rim bg-void/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-haze">Event stream</p>
          <ul className="mt-2 space-y-1.5 font-mono text-[10.5px] leading-snug text-haze" aria-live="polite">
            <AnimatePresence initial={false}>
              {log.slice(0, 8).map((l, i) => <motion.li key={`${log.length - i}-${l}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="break-words"><span className="text-violet-soft">›</span> {l}</motion.li>)}
            </AnimatePresence>
          </ul>
        </div>
        <div className="rounded-xl border border-rim p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-haze">Preview state</p>
          <div role="radiogroup" aria-label="Preview data state" className="mt-2 grid grid-cols-4 gap-1">
            {DATA_STATES.map((s) => (
              <button key={s.id} role="radio" aria-checked={state === s.id} onClick={() => setState(s.id)} className={cn("rounded-md py-1 font-mono text-[10px] uppercase", state === s.id ? "bg-cyan/20 text-cyan ring-1 ring-cyan/50" : "text-haze hover:text-white")}>{s.label}</button>
            ))}
          </div>
        </div>
      </div>
      <p className="border-t border-rim px-4 py-2 font-mono text-[10px] text-haze"><ShieldCheck className="mr-1 inline h-3 w-3 text-lime-pulse" aria-hidden />Agents draft. Humans approve. Nothing ships unattended.</p>
    </div>
  );
}

export function CommandShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [dock, setDock] = useState(true);
  const [mobileDock, setMobileDock] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const current = commandScreens.find((s) => pathname.endsWith(`/${s.slug}`));
  useEffect(() => { setMobileNav(false); setMobileDock(false); }, [pathname]);

  return (
    <PreviewStateProvider>
      <AgentProvider>
        <div className="relative min-h-screen bg-void font-grotesk text-[#d9d9f0]" style={{ ["--focus-ring" as string]: "#22d3ee" }}>
          <div className="pointer-events-none fixed inset-0 grid-glow opacity-60" aria-hidden />
          <div className="pointer-events-none fixed -left-40 top-0 h-[520px] w-[520px] rounded-full bg-violet/20 blur-[140px]" aria-hidden />
          <div className="pointer-events-none fixed -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-cyan/10 blur-[140px]" aria-hidden />
          <a href="#c-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-violet focus:px-3 focus:py-1.5 focus:text-white">Skip to content</a>

          {/* Icon rail */}
          <nav aria-label="Command sections" className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col items-center border-r border-rim bg-obsidian/80 py-4 backdrop-blur md:flex">
            <Link href="/command" className="mb-6 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet to-cyan shadow-[0_0_24px_-4px_rgba(139,92,246,0.9)]" aria-label="Nexora Campaign Command home">
              <Crosshair className="h-5 w-5 text-white" aria-hidden />
            </Link>
            <ul className="flex flex-1 flex-col items-center gap-1.5 overflow-y-auto no-scrollbar">
              {commandScreens.map((s) => {
                const Icon = ICONS[s.slug];
                const active = current?.slug === s.slug;
                return (
                  <li key={s.slug} className="group relative">
                    <Link href={`${COMMAND_BASE}/${s.slug}`} aria-label={s.label} aria-current={active ? "page" : undefined} className={cn("relative grid h-11 w-11 place-items-center rounded-xl transition", active ? "text-white" : "text-haze hover:bg-carbon-2 hover:text-white")}>
                      {active && <motion.span layoutId="c-rail" className="absolute inset-0 rounded-xl border border-violet/60 bg-violet/15 shadow-[0_0_20px_-4px_rgba(139,92,246,0.9)]" />}
                      <Icon className="relative h-[18px] w-[18px]" aria-hidden />
                    </Link>
                    <span className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-rim bg-obsidian px-2 py-1 font-mono text-[11px] text-white opacity-0 transition group-hover:opacity-100">{s.label}</span>
                  </li>
                );
              })}
            </ul>
            <Link href="/" className="mt-2 font-mono text-[9px] tracking-widest text-haze hover:text-white">EXIT</Link>
          </nav>

          <div className={cn("relative transition-[padding] duration-300 md:pl-[76px]", dock && "xl:pr-[320px]")}>
            <header className="sticky top-0 z-30 border-b border-rim bg-void/70 backdrop-blur-xl">
              <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
                <div className="flex min-w-0 items-center gap-2 font-mono text-[11px]">
                  <span className="hidden text-haze sm:inline">NEXORA//COMMAND</span>
                  <ChevronRight className="hidden h-3 w-3 text-rim sm:inline" aria-hidden />
                  <span className="truncate text-cyan">LUMEN&amp;OAK</span>
                  <ChevronRight className="h-3 w-3 text-rim" aria-hidden />
                  <span className="truncate uppercase text-white">{current?.label ?? "Bridge"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden lg:inline-flex"><Chip tone="lime" pulse>data plane nominal</Chip></span>
                  <span className="hidden md:inline-flex"><Chip tone="magenta">{DEMO_NOTICE.split(" — ")[0]}</Chip></span>
                  <kbd className="hidden items-center gap-1 rounded-md border border-rim px-1.5 py-0.5 font-mono text-[10px] text-haze sm:inline-flex"><CmdIcon className="h-3 w-3" aria-hidden />K</kbd>
                  <button onClick={() => setDock((d) => !d)} className="hidden h-9 items-center gap-2 rounded-xl border border-rim px-3 text-xs text-white hover:border-violet/60 xl:inline-flex" aria-pressed={dock}>
                    {dock ? <PanelRightClose className="h-4 w-4" aria-hidden /> : <PanelRightOpen className="h-4 w-4" aria-hidden />} Agents
                  </button>
                </div>
              </div>
            </header>
            <main id="c-main" className="relative px-4 pb-32 pt-6 md:px-6 md:pb-10">
              <AnimatePresence mode="wait">
                <motion.div key={pathname} initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8, filter: "blur(6px)" }} transition={{ duration: 0.35 }}>
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>

          {/* Desktop dock */}
          <AnimatePresence>
            {dock && (
              <motion.aside aria-label="Agent dock" initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }} transition={{ type: "spring", damping: 30, stiffness: 260 }} className="fixed inset-y-0 right-0 z-30 hidden w-[320px] border-l border-rim bg-obsidian/85 pt-14 backdrop-blur-xl xl:block">
                <AgentDock />
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Mobile floating dock */}
          <div className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between rounded-2xl border border-rim bg-obsidian/90 p-1.5 shadow-[0_0_40px_-10px_rgba(139,92,246,0.7)] backdrop-blur-xl md:hidden">
            {["bridge", "missions", "telemetry", "copilot"].map((slug) => {
              const Icon = ICONS[slug];
              const active = current?.slug === slug;
              return <Link key={slug} href={`${COMMAND_BASE}/${slug}`} aria-label={commandScreens.find((s) => s.slug === slug)!.label} aria-current={active ? "page" : undefined} className={cn("grid h-11 w-11 place-items-center rounded-xl", active ? "bg-violet/25 text-white" : "text-haze")}><Icon className="h-5 w-5" aria-hidden /></Link>;
            })}
            <button onClick={() => setMobileNav(true)} aria-label="All sections" className="grid h-11 w-11 place-items-center rounded-xl text-haze"><Shapes className="h-5 w-5" aria-hidden /></button>
            <button onClick={() => setMobileDock(true)} aria-label="Open agent dock" className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet to-cyan text-white"><Bot className="h-5 w-5" aria-hidden /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-magenta" /></button>
          </div>
          <AnimatePresence>
            {(mobileDock || mobileNav) && (
              <motion.div className="fixed inset-0 z-50 bg-void/80 backdrop-blur-sm md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setMobileDock(false); setMobileNav(false); }} />
            )}
            {mobileDock && (
              <motion.div role="dialog" aria-modal="true" aria-label="Agent dock" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 280 }} className="fixed inset-x-0 bottom-0 z-50 h-[78vh] rounded-t-3xl border-t border-rim bg-obsidian md:hidden">
                <AgentDock onClose={() => setMobileDock(false)} />
              </motion.div>
            )}
            {mobileNav && (
              <motion.div role="dialog" aria-modal="true" aria-label="All sections" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed inset-x-4 bottom-24 z-50 rounded-3xl border border-rim bg-obsidian p-4 md:hidden">
                <ul className="grid grid-cols-3 gap-2">
                  {commandScreens.map((s, i) => {
                    const Icon = ICONS[s.slug];
                    return (
                      <motion.li key={s.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                        <Link href={`${COMMAND_BASE}/${s.slug}`} className="flex flex-col items-center gap-1.5 rounded-2xl border border-rim p-3 text-center font-mono text-[10px] uppercase tracking-wider text-white"><Icon className="h-5 w-5 text-violet-soft" aria-hidden />{s.label}</Link>
                      </motion.li>
                    );
                  })}
                </ul>
                <Link href="/" className="mt-3 block text-center font-mono text-[10px] text-haze">← ALL CONCEPTS</Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AgentProvider>
    </PreviewStateProvider>
  );
}
