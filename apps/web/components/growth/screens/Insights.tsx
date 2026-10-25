"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, CornerDownLeft, FileSearch, ShieldAlert } from "lucide-react";
import { Badge, Gate, Panel } from "../ui";
import { recommendations as seed, type Recommendation } from "@/lib/demo-data";
import { askCopilot, SUGGESTED_QUESTIONS, type CopilotAnswer } from "@/lib/copilot";
import { cn } from "@/lib/format";

export default function Insights() {
  const [recs, setRecs] = useState(seed);
  const [sel, setSel] = useState(seed[0].id);
  const [q, setQ] = useState("");
  const [thread, setThread] = useState<CopilotAnswer[]>([askCopilot(SUGGESTED_QUESTIONS[0])]);
  const r = recs.find((x) => x.id === sel)!;
  const set = (status: Recommendation["status"]) => setRecs((xs) => xs.map((x) => (x.id === sel ? { ...x, status } : x)));
  const ask = (t: string) => { if (t.trim()) { setThread((th) => [...th, askCopilot(t)]); setQ(""); } };

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr_1fr]">
      <Panel title="Recommendation queue" subtitle={`${recs.filter((x) => x.status === "New").length} new`} bodyClass="p-2">
        <Gate rows={5}>
          <ul className="space-y-1">
            {recs.map((x) => (
              <li key={x.id}>
                <button onClick={() => setSel(x.id)} aria-pressed={sel === x.id} className={cn("w-full rounded-lg p-2.5 text-left transition", sel === x.id ? "bg-electric/15 ring-1 ring-electric/50" : "hover:bg-navy-3/60")}>
                  <div className="flex items-center gap-1.5"><Badge tone="blue">{x.kind}</Badge><span className="ml-auto font-mono text-[10px] text-mist">{x.status}</span></div>
                  <p className="mt-1 text-[12.5px] text-white">{x.title}</p>
                </button>
              </li>
            ))}
          </ul>
        </Gate>
      </Panel>

      <Panel title={r.title} subtitle={`${r.id} · ${r.kind} · confidence ${r.confidence}`}>
        <Gate rows={6}>
          <p className="text-[12.5px] text-mist">{r.summary}</p>
          <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-wider text-teal">Observed evidence</p>
          <ul className="mt-1 space-y-1.5">
            {r.evidence.map((e) => <li key={e.text} className="flex gap-2 rounded-md border border-teal/20 bg-teal/5 p-2 text-[12px]"><FileSearch className="h-4 w-4 shrink-0 text-teal" aria-hidden /><span className="flex-1">{e.text}</span><code className="font-mono text-[10.5px] text-electric-soft">{e.ref}</code></li>)}
          </ul>
          <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-wider text-amber-signal">Assumptions</p>
          <ul className="mt-1 space-y-1.5">{r.assumptions.map((a) => <li key={a} className="rounded-md border border-amber-signal/20 bg-amber-signal/5 p-2 text-[12px]">{a}</li>)}</ul>
          <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-wider text-mist">Estimated impact</p>
          <p className="font-mono text-[12.5px] text-white">{r.impact}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-line/60 pt-4">
            <button disabled={r.status === "Approved"} onClick={() => set("Approved")} className="rounded-md bg-electric px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-40">{r.requiresApproval ? "Approve → create draft change" : "Acknowledge"}</button>
            <button onClick={() => set("Under review")} className="rounded-md border border-slate-line px-3 py-1.5 text-[12px] text-white">Assign for review</button>
            <button onClick={() => set("Dismissed")} className="rounded-md px-3 py-1.5 text-[12px] text-mist hover:text-coral-signal">Dismiss</button>
            {r.requiresApproval && <span className="flex items-center gap-1 text-[11px] text-mist"><ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Approval creates a draft only; external platforms are not modified.</span>}
          </div>
        </Gate>
      </Panel>

      <Panel title="Copilot" subtitle="Grounded in workspace data · cites records · preview uses deterministic answers, no LLM" actions={<Bot className="h-4 w-4 text-electric-soft" aria-hidden />} bodyClass="flex flex-col p-0">
        <div className="max-h-[520px] flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin" aria-live="polite">
          <AnimatePresence initial={false}>
            {thread.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                <p className="ml-auto w-fit max-w-[85%] rounded-lg bg-electric/25 px-3 py-1.5 text-[12.5px] text-white">{a.question}</p>
                <div className="rounded-lg border border-slate-line/60 bg-midnight/50 p-3 text-[12px]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-teal">Analysis</p>
                  <ul className="mt-1 space-y-0.5">{a.analysis.map((x) => <li key={x}>{x}</li>)}</ul>
                  {a.recommendation && <><p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-electric-soft">Recommendation</p><p>{a.recommendation}</p></>}
                  <p className="mt-2 text-[11px] text-amber-signal">Uncertainty: {a.uncertainty}</p>
                  {a.citations.length > 0 && <p className="mt-1.5 flex flex-wrap gap-1">{a.citations.map((c) => <code key={c} className="rounded bg-navy-3 px-1 font-mono text-[10px] text-mist">{c}</code>)}</p>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="border-t border-slate-line/60 p-3">
          <div className="mb-2 flex flex-wrap gap-1">{SUGGESTED_QUESTIONS.slice(1).map((s) => <button key={s} onClick={() => ask(s)} className="rounded-md border border-slate-line px-2 py-0.5 text-[10.5px] text-mist hover:text-white">{s}</button>)}</div>
          <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex items-center gap-2 rounded-lg border border-slate-line bg-midnight px-2">
            <label htmlFor="g-ask" className="sr-only">Ask the copilot</label>
            <input id="g-ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about campaigns, channels, segments…" className="h-9 flex-1 bg-transparent text-[12.5px] text-white placeholder:text-mist focus:outline-none" />
            <button aria-label="Send" className="grid h-7 w-7 place-items-center rounded-md bg-electric text-white"><CornerDownLeft className="h-3.5 w-3.5" aria-hidden /></button>
          </form>
        </div>
      </Panel>
    </div>
  );
}
