"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Check, FileSearch, X } from "lucide-react";
import { Button, Card, Eyebrow, Gate, PageHeader, Pill, Rule } from "../ui";
import { recommendations as seed, type Recommendation } from "@/lib/demo-data";
import { askCopilot, SUGGESTED_QUESTIONS, type CopilotAnswer } from "@/lib/copilot";
import { cn } from "@/lib/format";

export default function Counsel() {
  const [recs, setRecs] = useState(seed);
  const [q, setQ] = useState("");
  const [answers, setAnswers] = useState<CopilotAnswer[]>([]);
  const decide = (id: string, status: Recommendation["status"]) => setRecs((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
  const ask = (text: string) => {
    if (!text.trim()) return;
    setAnswers((a) => [askCopilot(text), ...a]);
    setQ("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Counsel"
        title={<>Considered <span className="italic text-champagne-deep">advice</span>, with its workings shown</>}
        intro="Each recommendation separates what we observed from what we assumed. Nothing is actioned without a person’s approval."
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <Gate rows={5} emptyTitle="No counsel today" emptyBody="Recommendations appear once enough measured data accumulates.">
          <ol className="space-y-6">
            {recs.map((r, i) => (
              <motion.li key={r.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={cn("p-7", r.status === "Dismissed" && "opacity-50")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="dark">{r.kind}</Pill>
                    <Pill tone={r.confidence === "High" ? "sage" : r.confidence === "Medium" ? "gold" : "rose"}>{r.confidence} confidence</Pill>
                    <span className="ml-auto text-xs text-stone">{r.id} · {r.status}</span>
                  </div>
                  <h2 className="mt-3 font-serif text-3xl leading-tight">{r.title}</h2>
                  <p className="mt-2 text-graphite-soft">{r.summary}</p>
                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#4d5a41]">Observed</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        {r.evidence.map((e) => <li key={e.text} className="flex gap-2"><FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden /><span>{e.text} <code className="ml-1 rounded bg-ivory-deep px-1.5 font-mono text-[11px]">{e.ref}</code></span></li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-champagne-deep">Assumed</p>
                      <ul className="mt-2 space-y-2 text-sm text-graphite-soft">{r.assumptions.map((a) => <li key={a}>— {a}</li>)}</ul>
                    </div>
                  </div>
                  <p className="mt-6 border-t border-parchment pt-4 font-serif text-lg italic">{r.impact}</p>
                  {r.status !== "Approved" && r.status !== "Dismissed" && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button onClick={() => decide(r.id, "Approved")}><Check className="h-4 w-4" aria-hidden /> {r.requiresApproval ? "Approve as draft change" : "Acknowledge"}</Button>
                      <Button variant="ghost" onClick={() => decide(r.id, "Dismissed")}><X className="h-4 w-4" aria-hidden /> Dismiss</Button>
                    </div>
                  )}
                  {r.status === "Approved" && <p className="mt-5 text-sm text-[#4d5a41]">Approved — queued as a draft change for the campaign owner. No external system was modified.</p>}
                </Card>
              </motion.li>
            ))}
          </ol>
        </Gate>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <Card className="bg-graphite p-7 text-ivory border-graphite">
            <p className="text-[11px] uppercase tracking-[0.22em] text-champagne">Ask the studio</p>
            <p className="mt-2 font-serif text-2xl">Questions answered from your data, with sources.</p>
            <form className="mt-5 flex items-center gap-2 rounded-full bg-ivory/10 p-1.5" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
              <label htmlFor="atl-ask" className="sr-only">Ask a question</label>
              <input id="atl-ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Which channels return best?" className="flex-1 bg-transparent px-3 text-sm placeholder:text-ivory/40 focus:outline-none" />
              <button className="grid h-9 w-9 place-items-center rounded-full bg-champagne text-graphite" aria-label="Ask"><ArrowUp className="h-4 w-4" aria-hidden /></button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.slice(0, 4).map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border border-ivory/20 px-3 py-1 text-left text-xs text-ivory/80 hover:border-champagne">{s}</button>)}
            </div>
            <p className="mt-4 text-[11px] text-ivory/50">Preview: deterministic answers computed from the synthetic dataset. No language model is connected.</p>
          </Card>
          <div className="mt-6 space-y-4" aria-live="polite">
            <AnimatePresence>
              {answers.map((a, i) => (
                <motion.div key={answers.length - i} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <p className="font-serif text-lg italic">“{a.question}”</p>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#4d5a41]">Analysis</p>
                    <ul className="mt-1 space-y-1 text-sm">{a.analysis.map((x) => <li key={x}>{x}</li>)}</ul>
                    {a.recommendation && (<><p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-champagne-deep">Recommendation</p><p className="text-sm">{a.recommendation}</p></>)}
                    <p className="mt-3 text-xs text-stone">Uncertainty: {a.uncertainty}</p>
                    {a.citations.length > 0 && <p className="mt-2 flex flex-wrap gap-1">{a.citations.map((c) => <code key={c} className="rounded bg-ivory-deep px-1.5 font-mono text-[11px]">{c}</code>)}</p>}
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </aside>
      </div>
      <Rule label="Counsel never sends, publishes or spends on its own" />
    </div>
  );
}
