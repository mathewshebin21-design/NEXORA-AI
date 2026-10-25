"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, ChevronRight, XCircle } from "lucide-react";
import { Badge, Gate, Panel } from "../ui";
import { assets as seed, brandVoice, type Asset } from "@/lib/demo-data";
import { cn } from "@/lib/format";

const COLS: Asset["status"][] = ["Draft", "In review", "Changes requested", "Approved"];
const NEXT: Record<Asset["status"], Asset["status"] | null> = { Draft: "In review", "In review": "Approved", "Changes requested": "In review", Approved: null };

export default function Creative() {
  const [items, setItems] = useState(seed);
  const [sel, setSel] = useState<string>(seed[2].id);
  const a = items.find((x) => x.id === sel)!;
  const blocked = a.checks.some((c) => c.state === "fail");
  const advance = (id: string) => setItems((xs) => xs.map((x) => (x.id === id && NEXT[x.status] ? { ...x, status: NEXT[x.status]!, version: x.version + (x.status === "Changes requested" ? 1 : 0) } : x)));

  return (
    <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <Panel title="Creative pipeline" subtitle={`${items.length} assets · approval workflow · scores from rule-based brand checks`}>
        <Gate rows={6}>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {COLS.map((col) => (
              <div key={col} className="rounded-lg bg-midnight/50 p-2">
                <p className="flex items-center justify-between px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-mist">{col}<span className="font-mono">{items.filter((i) => i.status === col).length}</span></p>
                <ul className="space-y-2">
                  {items.filter((i) => i.status === col).map((i) => (
                    <motion.li layout key={i.id}>
                      <button onClick={() => setSel(i.id)} aria-pressed={sel === i.id} className={cn("w-full rounded-lg border bg-navy-2 p-2.5 text-left transition", sel === i.id ? "border-electric" : "border-slate-line/60 hover:border-slate-line")}>
                        <div className="flex items-center justify-between"><Badge>{i.type}</Badge><span className={cn("font-mono text-[11px]", i.brandScore >= 85 ? "text-teal" : i.brandScore >= 75 ? "text-amber-signal" : "text-coral-signal")}>{i.brandScore}</span></div>
                        <p className="mt-1.5 text-[12.5px] font-medium text-white">{i.title}</p>
                        <p className="mt-0.5 text-[11px] text-mist">v{i.version} · {i.owner} · {i.updated}</p>
                        {i.checks.some((c) => c.state === "fail") && <p className="mt-1 flex items-center gap-1 text-[10.5px] text-coral-signal"><XCircle className="h-3 w-3" aria-hidden /> claim check failing</p>}
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Gate>
      </Panel>

      <div className="space-y-4">
        <Panel title={a.title} subtitle={`${a.id} · ${a.campaign} · v${a.version}`} actions={<Badge tone={a.status === "Approved" ? "teal" : a.status === "Changes requested" ? "coral" : "amber"}>{a.status}</Badge>}>
          <div className="rounded-lg border border-slate-line/60 bg-midnight/50 p-3">
            <p className="text-base font-semibold text-white">{a.headline}</p>
            <p className="mt-1 text-[12.5px] text-mist">{a.body}</p>
          </div>
          <ul className="mt-3 space-y-1.5">
            {a.checks.map((c, i) => (
              <li key={i} className="flex gap-2 text-[12px]">
                {c.state === "pass" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" aria-hidden /> : c.state === "warn" ? <AlertTriangle className="h-4 w-4 shrink-0 text-amber-signal" aria-hidden /> : <XCircle className="h-4 w-4 shrink-0 text-coral-signal" aria-hidden />}
                <span><span className="font-medium text-white">{c.label}</span> — {c.note}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {NEXT[a.status] && (
              <button disabled={blocked && NEXT[a.status] === "Approved"} onClick={() => advance(a.id)} className="inline-flex items-center gap-1 rounded-md bg-electric px-3 py-1.5 text-[12px] font-medium text-white hover:bg-electric/80 disabled:cursor-not-allowed disabled:opacity-40">
                Move to {NEXT[a.status]} <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
            {a.status !== "Changes requested" && a.status !== "Approved" && (
              <button onClick={() => setItems((xs) => xs.map((x) => (x.id === a.id ? { ...x, status: "Changes requested" } : x)))} className="rounded-md border border-slate-line px-3 py-1.5 text-[12px] text-white hover:bg-navy-3">Request changes</button>
            )}
            {blocked && <p className="w-full text-[11px] text-coral-signal">Approval blocked: unsupported claims must be removed or substantiated.</p>}
          </div>
        </Panel>
        <Panel title="Brand guardrails" subtitle={brandVoice.name}>
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div><p className="text-[10.5px] uppercase text-mist">Approved claims</p><ul className="mt-1 space-y-1 text-white">{brandVoice.approvedClaims.map((c) => <li key={c}>✓ {c}</li>)}</ul></div>
            <div><p className="text-[10.5px] uppercase text-mist">Avoid</p><ul className="mt-1 space-y-1 text-coral-signal/90">{brandVoice.avoid.map((c) => <li key={c}>✕ {c}</li>)}</ul></div>
          </div>
          <p className="mt-3 text-[11px] text-mist">AI text generation is provider-pluggable and not connected in this preview. Image/video generation: not integrated.</p>
        </Panel>
      </div>
    </div>
  );
}
