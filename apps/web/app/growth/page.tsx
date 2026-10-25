"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, BarChart3, CheckCircle2, GitCompareArrows, Menu, Scale, ShieldCheck, Sigma, X } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";
import { daily, liveCampaigns } from "@/lib/demo-data";
import { fmtCompactCurrency, fmtRatio } from "@/lib/format";
import { roas, sumPerformance } from "@/lib/metrics";
import { GROWTH_BASE } from "@/lib/screens";

const FEATURES = [
  { icon: BarChart3, t: "One revenue view", d: "Ad platforms, analytics and commerce joined into a single measured ledger per client." },
  { icon: GitCompareArrows, t: "Reported vs measured", d: "Platform conversions sit beside matched orders — never blended, never double counted." },
  { icon: Sigma, t: "Formulas you can audit", d: "Every KPI shows its formula and source fields. Tested code does the arithmetic, not a chatbot." },
  { icon: Scale, t: "Scenario planning", d: "Budget reallocation on explicit response-curve assumptions, with uncertainty bands." },
  { icon: CheckCircle2, t: "Experiment readouts", d: "Confidence intervals and p-values, with honest ‘inconclusive’ verdicts." },
  { icon: ShieldCheck, t: "Governed AI", d: "Copilot answers cite records and separate analysis from recommendation. Actions need approval." },
];

function Counter({ to, format }: { to: number; format: (v: number) => string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1400);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{format(v)}</>;
}

export default function GrowthLanding() {
  const [menu, setMenu] = useState(false);
  const t = sumPerformance(liveCampaigns);
  return (
    <div className="min-h-screen overflow-x-hidden bg-midnight font-sans text-[#dfe6fb]" style={{ ["--focus-ring" as string]: "#3d7bff" }}>
      <div className="border-b border-slate-line/60 bg-navy py-1.5 text-center text-[11px] text-mist">Concept B preview · <Link href="/" className="text-electric-soft underline">all concepts</Link> · synthetic data</div>
      <header className="sticky top-0 z-40 border-b border-slate-line/40 bg-midnight/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/growth" className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-electric to-teal text-sm font-bold text-white">N</span><span className="font-semibold text-white">Nexora <span className="font-normal text-mist">Growth Intelligence</span></span></Link>
          <nav aria-label="Primary" className="hidden items-center gap-7 text-sm md:flex">
            <a href="#product" className="text-mist hover:text-white">Product</a>
            <a href="#measurement" className="text-mist hover:text-white">Measurement</a>
            <a href="#agencies" className="text-mist hover:text-white">Agencies</a>
            <Link href="/login" className="text-mist hover:text-white">Sign in</Link>
            <Link href="/signup" className="rounded-lg bg-electric px-4 py-2 font-medium text-white hover:bg-electric/85">Start free</Link>
          </nav>
          <button onClick={() => setMenu(!menu)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-line md:hidden" aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu}>{menu ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}</button>
        </div>
        {menu && (
          <nav aria-label="Mobile" className="space-y-1 border-t border-slate-line/60 px-5 py-3 md:hidden">
            {["Product", "Measurement", "Agencies"].map((x) => <a key={x} href={`#${x.toLowerCase()}`} onClick={() => setMenu(false)} className="block py-2 text-mist">{x}</a>)}
            <Link href="/signup" className="block rounded-lg bg-electric px-4 py-2 text-center font-medium text-white">Start free</Link>
            <Link href="/login" className="block py-2 text-center text-mist">Sign in</Link>
          </nav>
        )}
      </header>

      <main>
        <section className="relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(61,123,255,0.25),transparent_60%)]" aria-hidden />
          <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-16 text-center md:pt-24">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2 rounded-full border border-electric/40 bg-electric/10 px-3 py-1 text-xs text-electric-soft">Revenue intelligence for agencies & growth teams</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mx-auto mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Know which marketing dollars <span className="bg-gradient-to-r from-electric-soft to-teal bg-clip-text text-transparent">actually come back.</span>
            </motion.h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-mist">Measured revenue, transparent attribution and evidence-backed recommendations across every client — computed by tested formulas, explained with sources.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-electric px-6 py-3 font-medium text-white hover:bg-electric/85">Create your agency <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link href={`${GROWTH_BASE}/overview`} className="rounded-lg border border-slate-line px-6 py-3 text-white hover:bg-navy-2">Explore the demo</Link>
            </div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="mx-auto mt-14 max-w-5xl rounded-2xl border border-slate-line bg-navy/80 p-3 text-left shadow-[0_40px_120px_-20px_rgba(61,123,255,0.45)]">
              <div className="flex items-center gap-1.5 px-2 pb-3"><span className="h-2.5 w-2.5 rounded-full bg-coral-signal/70" /><span className="h-2.5 w-2.5 rounded-full bg-amber-signal/70" /><span className="h-2.5 w-2.5 rounded-full bg-teal/70" /><span className="ml-3 font-mono text-[11px] text-mist">nexora · lumen-and-oak · overview (synthetic)</span></div>
              <div className="grid gap-3 sm:grid-cols-4">
                {[["Measured revenue", t.revenue, fmtCompactCurrency], ["Media spend", t.spend, fmtCompactCurrency], ["ROAS", roas(t.revenue, t.spend) ?? 0, (v: number) => fmtRatio(v)], ["Orders", t.conversions, (v: number) => Math.round(v).toLocaleString()]].map(([k, v, f]) => (
                  <div key={k as string} className="rounded-xl border border-slate-line/60 bg-navy-2 p-3"><p className="text-[10.5px] uppercase tracking-wider text-mist">{k as string}</p><p className="mt-1 font-mono text-xl text-white"><Counter to={v as number} format={f as (v: number) => string} /></p></div>
                ))}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr]">
                <div className="h-48 rounded-xl border border-slate-line/60 bg-navy-2 p-2">
                  <ResponsiveContainer>
                    <AreaChart data={daily}>
                      <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3d7bff" stopOpacity={0.5} /><stop offset="1" stopColor="#3d7bff" stopOpacity={0} /></linearGradient></defs>
                      <XAxis dataKey="label" hide />
                      <Area dataKey="revenue" stroke="#3d7bff" fill="url(#lg)" strokeWidth={1.5} animationDuration={1800} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-48 rounded-xl border border-slate-line/60 bg-navy-2 p-2">
                  <ResponsiveContainer>
                    <BarChart data={liveCampaigns.slice(0, 5).map((c) => ({ n: c.id, p: c.platformConversions, m: c.measuredConversions }))}>
                      <XAxis dataKey="n" hide />
                      <Bar dataKey="p" fill="#23315c" radius={2} />
                      <Bar dataKey="m" fill="#2ec5b6" radius={2} animationDuration={1800} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="product" className="mx-auto max-w-7xl px-5 py-20">
          <h2 className="text-3xl font-semibold text-white">An executive terminal for marketing returns</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div key={f.t} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="rounded-xl border border-slate-line/70 bg-navy-2/60 p-5 hover:border-electric/60">
                <f.icon className="h-5 w-5 text-electric-soft" aria-hidden />
                <h3 className="mt-3 font-semibold text-white">{f.t}</h3>
                <p className="mt-1 text-sm text-mist">{f.d}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="measurement" className="border-y border-slate-line/60 bg-navy py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold text-white">Measured first. Modelled second. Never invented.</h2>
              <p className="mt-4 text-mist">Ad platforms grade their own homework. Nexora keeps their numbers, but plans on orders you can match — and labels every assumption it makes along the way.</p>
              <ul className="mt-6 space-y-2 text-sm">
                {["Source lineage on every metric", "Five explicit attribution models with reconciliation checks", "Correlation is never presented as incrementality", "Forecasts carry assumptions and ranges"].map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-teal" aria-hidden />{x}</li>)}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-line bg-midnight p-5 font-mono text-[12.5px]">
              <p className="text-mist"># metric lineage · ROAS (sample)</p>
              <p className="mt-2 text-white">roas = attributed_revenue ÷ spend</p>
              <p className="text-electric-soft">  attributed_revenue ← commerce.orders (matched)</p>
              <p className="text-electric-soft">  spend              ← ad_platform.spend</p>
              <p className="mt-3 text-white">platform_conv = 1,912   <span className="text-mist">(Meta-reported)</span></p>
              <p className="text-white">measured_conv = 1,486   <span className="text-mist">(Shopify-matched)</span></p>
              <p className="text-amber-signal">gap = +28.7%  → planning uses measured</p>
            </div>
          </div>
        </section>

        <section id="agencies" className="mx-auto max-w-7xl px-5 py-20 text-center">
          <h2 className="text-3xl font-semibold text-white">Built for agencies running many clients</h2>
          <p className="mx-auto mt-3 max-w-2xl text-mist">Isolated client workspaces, role-based access, client-viewer seats and white-label reports. Pricing under research.</p>
          <Link href={`${GROWTH_BASE}/overview`} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-electric px-6 py-3 font-medium text-white">Explore the preview <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </section>
      </main>
      <footer className="border-t border-slate-line/60 py-8 text-center text-xs text-mist">Nexora Growth Intelligence — design concept B. All data shown is synthetic.</footer>
    </div>
  );
}
