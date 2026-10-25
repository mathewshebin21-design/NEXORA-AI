"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, History, ShieldCheck, X, XCircle } from "lucide-react";
import { ArtPlate } from "../ArtPlate";
import { Button, Card, Eyebrow, Gate, PageHeader, Pill } from "../ui";
import { assets as seed, brandVoice, contentCalendar, type Asset } from "@/lib/demo-data";
import { cn } from "@/lib/format";

const FILTERS = ["All", "In review", "Changes requested", "Draft", "Approved"] as const;

export default function Creative() {
  const [items, setItems] = useState(seed);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const open = items.find((a) => a.id === openId);
  const setStatus = (id: string, status: Asset["status"]) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));

  return (
    <div>
      <PageHeader
        eyebrow="Creative studio"
        title={<>The <span className="italic text-champagne-deep">collection</span> in progress</>}
        intro="Copy, scripts and briefs with version history, claims checks and brand-voice scoring. Image and video generation are not connected in this preview."
        actions={<Button variant="gold">New piece</Button>}
      />

      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={cn("rounded-full border px-4 py-1.5 text-sm", filter === f ? "border-graphite bg-graphite text-ivory" : "border-parchment hover:border-champagne")}>
            {f} <span className="ml-1 text-xs opacity-60">{f === "All" ? items.length : items.filter((i) => i.status === f).length}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-10 xl:grid-cols-[1fr_320px]">
        <Gate rows={4} emptyTitle="The studio is quiet" emptyBody="Start a brief or import copy from your drive.">
          <motion.ul layout className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {items.filter((a) => filter === "All" || a.status === filter).map((a) => (
                <motion.li key={a.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                  <button className="group block w-full text-left" onClick={() => setOpenId(a.id)}>
                    <div className="relative">
                      <ArtPlate variant={a.art} label={false} className="aspect-[4/5] rounded-[22px]" />
                      <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-ivory/90 p-4 backdrop-blur">
                        <p className="font-serif text-lg leading-tight">{a.headline}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Pill tone={a.status === "Approved" ? "sage" : a.status === "Changes requested" ? "rose" : a.status === "In review" ? "gold" : "neutral"}>{a.status}</Pill>
                      <span className="text-xs text-stone">Brand fit {a.brandScore}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-stone">{a.type} · v{a.version} · {a.updated}</p>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </Gate>

        <aside className="space-y-6">
          <Card>
            <Eyebrow>Brand voice</Eyebrow>
            <p className="mt-1 font-serif text-xl">{brandVoice.name}</p>
            <ul className="mt-4 space-y-2">
              {brandVoice.traits.map((t) => (
                <li key={t.trait} className="text-sm">
                  <div className="flex justify-between"><span>{t.trait}</span><span className="text-stone tabular">{Math.round(t.weight * 100)}</span></div>
                  <div className="mt-1 h-1 rounded-full bg-parchment"><div className="h-1 rounded-full bg-champagne" style={{ width: `${t.weight * 100}%` }} /></div>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-stone">We avoid</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">{brandVoice.avoid.map((x) => <li key={x}><Pill tone="rose">{x}</Pill></li>)}</ul>
            <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-stone">Approved claims</p>
            <ul className="mt-2 space-y-1 text-sm text-graphite-soft">{brandVoice.approvedClaims.map((x) => <li key={x} className="flex gap-2"><ShieldCheck className="h-4 w-4 text-sage" aria-hidden />{x}</li>)}</ul>
          </Card>
          <Card>
            <Eyebrow>This week&rsquo;s calendar</Eyebrow>
            <ul className="mt-3 space-y-2 text-sm">
              {contentCalendar.map((d) => (
                <li key={d.day} className="flex gap-3 border-b border-parchment pb-2 last:border-0">
                  <span className="w-14 shrink-0 font-serif text-stone">{d.day}</span>
                  <span className="space-y-0.5">{d.items.length ? d.items.map((i) => <span key={i.t} className="block">{i.t}</span>) : <span className="italic text-stone">Rest</span>}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-graphite/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpenId(null)} />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={open.title}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 240 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-ivory p-6 shadow-2xl md:p-10"
            >
              <div className="flex items-start justify-between">
                <div>
                  <Eyebrow>{open.type} · {open.id}</Eyebrow>
                  <h2 className="mt-2 font-serif text-3xl">{open.title}</h2>
                </div>
                <button onClick={() => setOpenId(null)} className="grid h-10 w-10 place-items-center rounded-full border border-parchment" aria-label="Close">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <ArtPlate variant={open.art} className="mt-6 aspect-[16/10] rounded-[22px]" />
              <p className="mt-6 font-serif text-3xl leading-tight">{open.headline}</p>
              <p className="mt-3 leading-relaxed text-graphite-soft">{open.body}</p>
              <div className="mt-8">
                <Eyebrow>Quality &amp; claims checks</Eyebrow>
                <ul className="mt-3 space-y-2">
                  {open.checks.map((c, i) => (
                    <li key={i} className={cn("flex gap-3 rounded-xl p-3 text-sm", c.state === "fail" ? "bg-[#f7ebe7]" : c.state === "warn" ? "bg-champagne-soft/60" : "bg-white")}>
                      {c.state === "pass" ? <Check className="h-4 w-4 shrink-0 text-sage" aria-hidden /> : c.state === "warn" ? <AlertTriangle className="h-4 w-4 shrink-0 text-champagne-deep" aria-hidden /> : <XCircle className="h-4 w-4 shrink-0 text-rosewood" aria-hidden />}
                      <span><strong className="font-medium">{c.label}:</strong> {c.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <Eyebrow>Version history</Eyebrow>
                <ol className="mt-3 space-y-2 text-sm">
                  {Array.from({ length: open.version }, (_, i) => open.version - i).slice(0, 4).map((v) => (
                    <li key={v} className="flex items-center gap-3"><History className="h-4 w-4 text-stone" aria-hidden /> v{v} <span className="text-stone">· {v === open.version ? open.updated : `${open.version - v + 1}d ago`} · {open.owner}</span></li>
                  ))}
                </ol>
              </div>
              <div className="sticky bottom-0 mt-10 flex flex-wrap gap-3 bg-ivory py-4">
                <Button onClick={() => setStatus(open.id, "Approved")} disabled={open.checks.some((c) => c.state === "fail")}>
                  <Check className="h-4 w-4" aria-hidden /> Approve
                </Button>
                <Button variant="ghost" onClick={() => setStatus(open.id, "Changes requested")}>Request changes</Button>
                {open.checks.some((c) => c.state === "fail") && <p className="w-full text-xs text-rosewood">Approval is blocked until failing claims are resolved.</p>}
                <p className="w-full text-xs text-stone">Current status: {open.status}. Approval is recorded in the audit log; it does not publish.</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
