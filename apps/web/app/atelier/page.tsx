"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { ArtPlate } from "@/components/atelier/ArtPlate";
import { ATELIER_BASE } from "@/lib/screens";

const CHAPTERS = [
  { n: "I", t: "Research", d: "A journal of evidence — search demand, reviews, competitors — each line marked as evidence, assumption or recommendation." },
  { n: "II", t: "Brief", d: "Objectives, audiences and messaging hierarchies, with budgets that show their arithmetic." },
  { n: "III", t: "Create", d: "Copy and scripts scored for brand voice, checked against an approved-claims sheet, versioned and approved by people." },
  { n: "IV", t: "Edition", d: "Client-ready reports where every number carries its source and formula." },
];

const PRINCIPLES = [
  ["No invented numbers", "Metrics are computed by tested formulas, never by a language model."],
  ["Claims, verified", "Copy that asserts something we can’t source is flagged before it reaches a client."],
  ["People approve", "Nothing is sent, published or spent without an authorised person signing off."],
  ["Clients, kept apart", "Every client workspace is isolated by design — data never crosses the line."],
];

export default function AtelierLanding() {
  const [menu, setMenu] = useState(false);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 600], [0, -60]);
  const y2 = useTransform(scrollY, [0, 600], [0, 40]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-ivory font-manrope text-graphite" style={{ ["--focus-ring" as string]: "#9c7e45" }}>
      <div className="bg-graphite py-1.5 text-center text-[11px] text-ivory/80">
        Concept A preview · <Link href="/" className="underline">all concepts</Link> · fictional product imagery and data
      </div>
      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-6 md:px-10">
        <Link href="/atelier" className="flex items-baseline gap-2"><span className="font-serif text-2xl">Nexora</span><span className="font-serif text-sm italic text-champagne-deep">Atelier</span></Link>
        <nav aria-label="Primary" className="hidden items-center gap-8 text-sm md:flex">
          <a href="#method" className="hover:text-champagne-deep">Method</a>
          <a href="#principles" className="hover:text-champagne-deep">Principles</a>
          <a href="#pricing" className="hover:text-champagne-deep">For agencies</a>
          <Link href={`${ATELIER_BASE}/today`} className="rounded-full bg-graphite px-5 py-2.5 text-ivory hover:bg-graphite-soft">Enter the studio</Link>
        </nav>
        <button className="grid h-10 w-10 place-items-center rounded-full border border-parchment md:hidden" onClick={() => setMenu(true)} aria-label="Open menu"><Menu className="h-5 w-5" aria-hidden /></button>
      </header>
      <AnimatePresence>
        {menu && (
          <motion.div role="dialog" aria-modal="true" aria-label="Menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ivory p-6">
            <div className="flex justify-end"><button className="grid h-10 w-10 place-items-center rounded-full border border-parchment" onClick={() => setMenu(false)} aria-label="Close menu"><X className="h-5 w-5" aria-hidden /></button></div>
            <nav aria-label="Mobile" className="mt-10 space-y-4 font-serif text-4xl">
              {["Method", "Principles"].map((x) => <a key={x} href={`#${x.toLowerCase()}`} onClick={() => setMenu(false)} className="block">{x}</a>)}
              <Link href={`${ATELIER_BASE}/today`} className="block italic text-champagne-deep">Enter the studio →</Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main">
        <section className="mx-auto grid max-w-[1400px] gap-12 px-5 pb-24 pt-10 md:px-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pt-20">
          <div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] font-semibold uppercase tracking-[0.26em] text-champagne-deep">The AI-native marketing studio for agencies</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="mt-6 font-serif text-[3.2rem] leading-[0.98] tracking-tight sm:text-7xl xl:text-[6.4rem]">
              Make the work <span className="italic text-champagne-deep">beautiful.</span> Make the numbers <span className="italic">honest.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 max-w-xl text-lg leading-relaxed text-graphite-soft">
              Nexora brings research, campaign briefs, creative review and revenue reporting into one considered workspace — with AI that shows its sources and never
              invents a figure.
            </motion.p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={`${ATELIER_BASE}/today`} className="inline-flex items-center gap-2 rounded-full bg-graphite px-7 py-3.5 text-ivory hover:bg-graphite-soft">Enter the studio <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <a href="#method" className="inline-flex items-center rounded-full border border-graphite/20 px-7 py-3.5 hover:border-graphite">See the method</a>
            </div>
          </div>
          <div className="relative h-[460px] sm:h-[560px]">
            <motion.div style={{ y: y1 }} className="absolute left-0 top-0 w-[58%]"><ArtPlate variant={0} className="aspect-[4/5] rounded-[30px] shadow-2xl" /></motion.div>
            <motion.div style={{ y: y2 }} className="absolute bottom-0 right-0 w-[52%]"><ArtPlate variant={2} className="aspect-[4/5] rounded-[30px] shadow-2xl" /></motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="absolute left-[30%] top-[44%] rounded-2xl bg-white/90 p-4 shadow-xl backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.18em] text-stone">Measured ROAS · sample</p>
              <p className="font-serif text-3xl">4.39×</p>
              <p className="text-[11px] text-stone">revenue ÷ spend · synthetic</p>
            </motion.div>
          </div>
        </section>

        <section id="method" className="bg-graphite py-24 text-ivory">
          <div className="mx-auto max-w-[1400px] px-5 md:px-10">
            <p className="text-[11px] uppercase tracking-[0.26em] text-champagne">The method</p>
            <h2 className="mt-4 max-w-3xl font-serif text-5xl leading-tight md:text-6xl">From a question to a client-ready edition, in four chapters.</h2>
            <ol className="mt-16 grid gap-px overflow-hidden rounded-[28px] bg-ivory/10 md:grid-cols-4">
              {CHAPTERS.map((c, i) => (
                <motion.li key={c.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-graphite p-8">
                  <span className="font-serif text-5xl italic text-champagne">{c.n}</span>
                  <p className="mt-6 font-serif text-3xl">{c.t}</p>
                  <p className="mt-3 text-sm leading-relaxed text-ivory/70">{c.d}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1400px] gap-10 px-5 py-24 md:px-10 lg:grid-cols-3">
          {[1, 3, 5].map((v, i) => (
            <motion.figure key={v} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="group">
              <ArtPlate variant={v} className="aspect-[4/5] rounded-[26px]" />
              <figcaption className="mt-4 font-serif text-2xl">{["A creative studio with a conscience", "Briefs that do their own arithmetic", "Editions your clients will read"][i]}</figcaption>
            </motion.figure>
          ))}
        </section>

        <section id="principles" className="border-y border-parchment bg-ivory-deep py-24">
          <div className="mx-auto max-w-[1400px] px-5 md:px-10">
            <h2 className="font-serif text-5xl">House principles</h2>
            <dl className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
              {PRINCIPLES.map(([t, d]) => (
                <div key={t} className="border-t border-champagne pt-5"><dt className="font-serif text-2xl">{t}</dt><dd className="mt-2 text-sm leading-relaxed text-graphite-soft">{d}</dd></div>
              ))}
            </dl>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-[1400px] px-5 py-24 text-center md:px-10">
          <p className="text-[11px] uppercase tracking-[0.26em] text-champagne-deep">For agencies of 5–50</p>
          <h2 className="mx-auto mt-4 max-w-3xl font-serif text-5xl leading-tight md:text-6xl">One studio. Every client, <span className="italic">kept apart.</span></h2>
          <p className="mx-auto mt-6 max-w-xl text-graphite-soft">Indicative pricing under research — see the commercial notes in the project documentation.</p>
          <Link href={`${ATELIER_BASE}/today`} className="mt-10 inline-flex items-center gap-2 rounded-full bg-champagne px-8 py-4 text-graphite hover:bg-champagne-deep hover:text-ivory">Explore the preview <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </section>
      </main>
      <footer className="border-t border-parchment py-10 text-center text-xs text-stone">Nexora Atelier — design concept A. All brands, people and figures shown are fictional.</footer>
    </div>
  );
}
