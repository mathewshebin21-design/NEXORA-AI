"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Bot, Crosshair, Lock, Network, Radar, ScanLine, Workflow } from "lucide-react";
import { COMMAND_BASE } from "@/lib/screens";

const AGENTS = [
  { icon: Radar, name: "Research agent", line: "Cites every source. Unsourced → assumption." },
  { icon: ScanLine, name: "Creative agent", line: "Drafts variants. Scans claims before review." },
  { icon: Network, name: "Analyst agent", line: "Reconciles platform vs measured conversions." },
  { icon: Workflow, name: "Ops agent", line: "Prepares launches. Never publishes alone." },
];
const LOG = [
  "research.agent › ingest review corpus (synthetic) ✓",
  "analyst.agent  › gap Meta vs Shopify = +28.7% ✓",
  "creative.agent › 3 headline variants → awaiting approval",
  "claims.scanner › 'best-selling in America' flagged ✕",
  "human.owner    › approved AST-502 v7 ✓",
  "ops.agent      › launch package ready · publish locked",
];

export default function CommandLanding() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % LOG.length), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-void font-grotesk text-[#d9d9f0]" style={{ ["--focus-ring" as string]: "#22d3ee" }}>
      <div className="pointer-events-none absolute inset-0 grid-glow" aria-hidden />
      <div className="pointer-events-none absolute left-1/2 top-[-200px] h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-violet/25 blur-[160px]" aria-hidden />
      <div className="relative border-b border-rim bg-obsidian/70 py-1.5 text-center font-mono text-[10.5px] tracking-wider text-haze">CONCEPT C PREVIEW · <Link href="/" className="text-cyan underline">ALL CONCEPTS</Link> · SYNTHETIC DATA</div>
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link href="/command" className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet to-cyan"><Crosshair className="h-5 w-5 text-white" aria-hidden /></span><span className="font-bold text-white">NEXORA <span className="font-normal text-haze">// Campaign Command</span></span></Link>
        <Link href={`${COMMAND_BASE}/bridge`} className="rounded-xl border border-violet/60 bg-violet/15 px-4 py-2 text-sm text-white hover:bg-violet/25">Launch console</Link>
      </header>

      <main className="relative">
        <section className="mx-auto max-w-7xl px-5 pb-20 pt-10 text-center md:pt-20">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-[11px] tracking-[0.4em] text-cyan">AI-NATIVE CAMPAIGN OPERATIONS</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9 }} className="mx-auto mt-5 max-w-5xl text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-7xl">
            Agents run the work. <span className="bg-gradient-to-r from-violet-soft via-cyan to-magenta bg-clip-text text-transparent">You hold the controls.</span>
          </motion.h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-haze">A command center where research, creative, launch and optimization agents coordinate every campaign — with approval gates on anything that spends, sends or publishes.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href={`${COMMAND_BASE}/bridge`} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet to-cyan/80 px-6 py-3 font-medium text-white shadow-[0_0_40px_-6px_rgba(139,92,246,0.9)]">Enter the bridge <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            <Link href={`${COMMAND_BASE}/journeys`} className="rounded-xl border border-rim px-6 py-3 text-white hover:border-cyan/60">See a journey map</Link>
          </div>

          <div className="relative mx-auto mt-16 grid max-w-5xl gap-4 text-left md:grid-cols-[1.2fr_1fr]">
            <div className="rounded-2xl border border-rim bg-obsidian/80 p-5 backdrop-blur">
              <p className="font-mono text-[10.5px] tracking-[0.3em] text-violet-soft">LIVE OPS STREAM · REPLAY</p>
              <ul className="mt-3 space-y-2 font-mono text-[12px]" aria-live="polite">
                {LOG.map((l, k) => (
                  <motion.li key={l} animate={{ opacity: k === i ? 1 : 0.35, x: k === i ? 4 : 0 }} className={k === i ? "text-cyan" : "text-haze"}>{l}</motion.li>
                ))}
              </ul>
            </div>
            <div className="relative grid place-items-center rounded-2xl border border-rim bg-obsidian/80 p-6">
              <svg viewBox="0 0 200 200" className="h-56 w-56" aria-hidden>
                {[80, 58, 36].map((r, k) => <motion.circle key={r} cx="100" cy="100" r={r} fill="none" stroke={k === 0 ? "#8b5cf6" : "#2a2a40"} strokeDasharray="3 6" animate={{ rotate: k % 2 ? -360 : 360 }} style={{ originX: "100px", originY: "100px" }} transition={{ duration: 20 + k * 6, repeat: Infinity, ease: "linear" }} />)}
                {[0, 1, 2, 3].map((k) => {
                  const a = (k / 4) * Math.PI * 2;
                  return <motion.circle key={k} r="6" fill={["#8b5cf6", "#22d3ee", "#f472b6", "#a3e635"][k]} animate={{ cx: [100 + Math.cos(a) * 80, 100 + Math.cos(a + Math.PI) * 80, 100 + Math.cos(a) * 80], cy: [100 + Math.sin(a) * 80, 100 + Math.sin(a + Math.PI) * 80, 100 + Math.sin(a) * 80] }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }} />;
                })}
                <circle cx="100" cy="100" r="18" fill="#8b5cf6" opacity="0.6" />
              </svg>
              <Bot className="absolute h-7 w-7 text-white" aria-hidden />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20">
          <h2 className="text-center text-3xl font-bold text-white">Four agents. One rule: humans approve.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AGENTS.map((a, k) => (
              <motion.div key={a.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.1 }} whileHover={{ y: -6 }} className="rounded-2xl border border-rim bg-carbon/80 p-5 hover:border-violet/60 hover:shadow-[0_0_40px_-10px_rgba(139,92,246,0.9)]">
                <a.icon className="h-6 w-6 text-cyan" aria-hidden />
                <p className="mt-4 font-semibold text-white">{a.name}</p>
                <p className="mt-1 text-sm text-haze">{a.line}</p>
              </motion.div>
            ))}
          </div>
          <div className="mx-auto mt-14 flex max-w-3xl items-start gap-3 rounded-2xl border border-magenta/40 bg-magenta/5 p-5 text-sm">
            <Lock className="h-5 w-5 shrink-0 text-magenta" aria-hidden />
            <p className="text-haze"><span className="text-white">Guardrails are product, not policy.</span> Spend, sends and publishing are locked behind role-based approvals, idempotent jobs and a full audit trail. Agents can never invent a metric — numbers come from the deterministic engine.</p>
          </div>
        </section>
      </main>
      <footer className="relative border-t border-rim py-8 text-center font-mono text-[10.5px] text-haze">NEXORA CAMPAIGN COMMAND · DESIGN CONCEPT C · ALL DATA SYNTHETIC</footer>
    </div>
  );
}
