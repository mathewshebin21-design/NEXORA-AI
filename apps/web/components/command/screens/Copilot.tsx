"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Bot, CircleCheck, Loader, ShieldQuestion, Wrench } from "lucide-react";
import { Chip, Glow, NeonButton, ScreenHeader, Title } from "../ui";
import { useAgents } from "../Shell";
import { askCopilot, SUGGESTED_QUESTIONS, type CopilotAnswer } from "@/lib/copilot";
import { recommendations as seed, type Recommendation } from "@/lib/demo-data";
import { cn } from "@/lib/format";

type Turn = { a: CopilotAnswer; steps: string[]; shown: number };
const toolSteps = (q: string) => [
  `authorize(workspace="lumen-oak", role="Owner") → ok`,
  `classify_intent("${q.slice(0, 38)}${q.length > 38 ? "…" : ""}")`,
  `query_metrics(source="measured", engine="deterministic")`,
  `cite_records() · separate analysis / recommendation`,
];

export default function Copilot() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [recs, setRecs] = useState(seed);
  const { push } = useAgents();
  const endRef = useRef<HTMLDivElement>(null);
  const busy = turns.some((t) => t.shown < t.steps.length);

  useEffect(() => {
    const t = turns.findIndex((x) => x.shown < x.steps.length);
    if (t < 0) return;
    const id = setTimeout(() => setTurns((xs) => xs.map((x, i) => (i === t ? { ...x, shown: x.shown + 1 } : x))), 380);
    return () => clearTimeout(id);
  }, [turns]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [turns]);

  const ask = (text: string) => {
    if (!text.trim() || busy) return;
    setTurns((xs) => [...xs, { a: askCopilot(text), steps: toolSteps(text), shown: 0 }]);
    setQ("");
  };
  const decide = (r: Recommendation, status: Recommendation["status"]) => {
    setRecs((xs) => xs.map((x) => (x.id === r.id ? { ...x, status } : x)));
    push(`human.decision  ${r.id} → ${status.toLowerCase()} (draft only)`);
  };

  return (
    <div>
      <ScreenHeader code="CMD-08 · COPILOT" title="Marketing copilot" sub="Grounded in this workspace only. Every number is computed by the metric engine and cited; external actions need your approval." />
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Glow className="flex min-h-[560px] flex-col p-0">
          <div className="flex items-center justify-between border-b border-rim px-5 py-3"><span className="flex items-center gap-2 text-sm text-white"><Bot className="h-4 w-4 text-violet" aria-hidden /> Copilot session</span><Chip tone="magenta">deterministic preview · no LLM</Chip></div>
          <div className="flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin" aria-live="polite">
            {turns.length === 0 && (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 3, repeat: Infinity }} className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet to-cyan shadow-[0_0_40px_-6px_rgba(139,92,246,0.9)]"><Bot className="h-8 w-8 text-white" aria-hidden /></motion.div>
                  <p className="mt-4 text-white">Ask about campaigns, channels, segments or tests.</p>
                  <p className="text-sm text-haze">I’ll show my tool calls and cite the records I used.</p>
                </div>
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className="space-y-3">
                <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-violet/25 px-4 py-2 text-sm text-white">{t.a.question}</p>
                <div className="rounded-xl border border-rim bg-void/70 p-3 font-mono text-[11px]">
                  {t.steps.map((s, j) => (
                    <p key={s} className={cn("flex items-center gap-2", j < t.shown ? "text-haze" : "text-haze/25")}>
                      {j < t.shown ? <CircleCheck className="h-3 w-3 text-lime-pulse" aria-hidden /> : j === t.shown ? <Loader className="h-3 w-3 animate-spin text-cyan" aria-hidden /> : <Wrench className="h-3 w-3" aria-hidden />} {s}
                    </p>
                  ))}
                </div>
                <AnimatePresence>
                  {t.shown >= t.steps.length && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl rounded-bl-sm border border-violet/40 bg-carbon-2 p-4 text-sm">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Analysis</p>
                      <ul className="mt-1 space-y-1 text-white">{t.a.analysis.map((x) => <li key={x}>{x}</li>)}</ul>
                      {t.a.recommendation && <><p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-soft">Recommendation</p><p className="text-white">{t.a.recommendation}</p></>}
                      <p className="mt-3 flex gap-2 text-xs text-magenta"><ShieldQuestion className="h-4 w-4 shrink-0" aria-hidden /> {t.a.uncertainty}</p>
                      {t.a.citations.length > 0 && <p className="mt-2 flex flex-wrap gap-1">{t.a.citations.map((c) => <span key={c} className="rounded-md border border-rim px-1.5 font-mono text-[10px] text-haze">{c}</span>)}</p>}
                      {t.a.requiresApproval && <p className="mt-2 font-mono text-[10.5px] text-lime-pulse">↳ Any resulting change will be queued for approval.</p>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="border-t border-rim p-4">
            <div className="mb-3 flex flex-wrap gap-1.5">{SUGGESTED_QUESTIONS.map((s) => <button key={s} disabled={busy} onClick={() => ask(s)} className="rounded-full border border-rim px-2.5 py-1 text-[11px] text-haze hover:border-violet/60 hover:text-white disabled:opacity-40">{s}</button>)}</div>
            <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex items-center gap-2 rounded-2xl border border-rim bg-void/80 p-1.5 focus-within:border-violet/60">
              <label htmlFor="c-ask" className="sr-only">Message the copilot</label>
              <input id="c-ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask the copilot…" className="h-10 flex-1 bg-transparent px-3 text-sm text-white placeholder:text-haze focus:outline-none" />
              <button disabled={busy} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet to-cyan text-white disabled:opacity-40"><ArrowUp className="h-4 w-4" aria-hidden /></button>
            </form>
          </div>
        </Glow>

        <div className="space-y-4">
          <Title kicker="Proposed actions">Approval queue</Title>
          {recs.map((r) => (
            <motion.div key={r.id} layout>
              <Glow active={r.status === "New" && r.requiresApproval} className={cn("p-4", r.status === "Dismissed" && "opacity-40")}>
                <div className="flex items-center gap-2"><Chip tone="violet">{r.kind}</Chip><Chip tone={r.confidence === "High" ? "lime" : r.confidence === "Medium" ? "cyan" : "magenta"}>{r.confidence}</Chip><span className="ml-auto font-mono text-[10px] text-haze">{r.status}</span></div>
                <p className="mt-2 font-semibold text-white">{r.title}</p>
                <p className="mt-1 font-mono text-[11px] text-cyan">{r.impact}</p>
                <p className="mt-1 text-xs text-haze">Evidence: {r.evidence.map((e) => e.ref).join(", ")} · {r.assumptions.length} assumption(s)</p>
                {r.status === "New" && (
                  <div className="mt-3 flex gap-2">
                    <NeonButton className="flex-1 py-1.5 text-xs" onClick={() => decide(r, "Approved")}>Approve draft</NeonButton>
                    <NeonButton variant="ghost" className="py-1.5 text-xs" onClick={() => decide(r, "Dismissed")}>Dismiss</NeonButton>
                  </div>
                )}
              </Glow>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
