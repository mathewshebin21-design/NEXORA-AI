"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, FileUp, Link2, Sparkles } from "lucide-react";
import { Button, Card, Eyebrow, Gate, PageHeader, Pill, Rule } from "../ui";
import { competitors, findings, searchQueries, type Finding } from "@/lib/demo-data";
import { cn, fmtNumber, fmtPct } from "@/lib/format";
import { ctr } from "@/lib/metrics";

const BASIS_TONE: Record<Finding["basis"], "sage" | "gold" | "dark"> = { Evidence: "sage", Assumption: "gold", Recommendation: "dark" };
const AREAS = ["All", ...Array.from(new Set(findings.map((f) => f.area)))];

export default function Research() {
  const [area, setArea] = useState("All");
  const [open, setOpen] = useState<string | null>(findings[0].id);
  const list = findings.filter((f) => area === "All" || f.area === area);

  return (
    <div>
      <PageHeader
        eyebrow="Research journal"
        title={<>What the market is <span className="italic text-champagne-deep">telling us</span></>}
        intro="Every entry is marked as evidence, assumption or recommendation, with its source. Nothing here is inferred from data we don’t hold."
        actions={
          <>
            <Button variant="ghost"><FileUp className="h-4 w-4" aria-hidden /> Upload research</Button>
            <Button><Sparkles className="h-4 w-4" aria-hidden /> New inquiry</Button>
          </>
        }
      />

      <div className="mt-8 flex flex-wrap items-center gap-2" role="tablist" aria-label="Research areas">
        {AREAS.map((a) => (
          <button key={a} role="tab" aria-selected={area === a} onClick={() => setArea(a)} className={cn("rounded-full border px-4 py-1.5 text-sm transition", area === a ? "border-graphite bg-graphite text-ivory" : "border-parchment hover:border-champagne")}>
            {a}
          </button>
        ))}
        <span className="ml-auto flex gap-2 text-xs text-stone">
          <Pill tone="sage">Evidence</Pill><Pill tone="gold">Assumption</Pill><Pill tone="dark">Recommendation</Pill>
        </span>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <Gate rows={5} emptyTitle="No entries yet" emptyBody="Upload a survey, review export or connect Search Console to begin the journal.">
          <ol className="divide-y divide-parchment border-y border-parchment">
            {list.map((f, i) => (
              <li key={f.id}>
                <button onClick={() => setOpen(open === f.id ? null : f.id)} aria-expanded={open === f.id} className="flex w-full items-start gap-5 py-6 text-left">
                  <span className="font-serif text-sm text-champagne-deep tabular">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <Pill tone={BASIS_TONE[f.basis]}>{f.basis}</Pill>
                      <span className="text-xs uppercase tracking-[0.16em] text-stone">{f.area}</span>
                    </span>
                    <span className="mt-2 block font-serif text-2xl leading-snug">{f.claim}</span>
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open === f.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mb-6 ml-10 rounded-2xl bg-ivory-deep p-5 text-sm">
                        <p className="text-graphite-soft">{f.detail}</p>
                        <p className="mt-3 flex items-center gap-2 text-xs text-stone"><Link2 className="h-3.5 w-3.5" aria-hidden /> {f.source}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ol>
        </Gate>

        <aside className="space-y-6">
          <Card>
            <Eyebrow>Search demand</Eyebrow>
            <p className="mt-1 font-serif text-xl">Top queries · last 28 days</p>
            <p className="mt-1 text-xs text-stone">Source: uploaded Search Console export (synthetic). Volumes from paid SEO tools are not connected.</p>
            <Gate rows={4} className="mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-stone">
                    <th className="pb-2 font-medium">Query</th>
                    <th className="pb-2 text-right font-medium">Clicks</th>
                    <th className="pb-2 text-right font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {searchQueries.map((q) => (
                    <tr key={q.query} className="border-t border-parchment">
                      <td className="py-2 pr-2">{q.query}<span className="block text-[11px] text-stone">{q.intent} · pos {q.position}</span></td>
                      <td className="py-2 text-right tabular">{fmtNumber(q.clicks)}</td>
                      <td className="py-2 text-right tabular">{fmtPct(ctr(q.clicks, q.impressions))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Gate>
          </Card>
          <Card>
            <Eyebrow>Competitive set</Eyebrow>
            <ul className="mt-3 space-y-4">
              {competitors.map((c) => (
                <li key={c.name} className="border-b border-parchment pb-4 last:border-0">
                  <div className="flex items-baseline justify-between">
                    <p className="font-serif text-lg">{c.name}</p>
                    <span className="text-xs text-stone">price index {c.priceIndex.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-graphite-soft">{c.positioning} — <span className="italic">“{c.heroClaim}”</span></p>
                  <p className="mt-1 text-[11px] text-stone">Share of voice: not measured (no provider connected)</p>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>

      <Rule label="Method" />
      <p className="mx-auto flex max-w-2xl items-start gap-3 text-sm text-graphite-soft">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-champagne-deep" aria-hidden />
        Research agents may only cite connected sources and uploaded documents. Where no source exists, the entry is labelled an assumption and is excluded
        from forecasts until validated.
      </p>
    </div>
  );
}
