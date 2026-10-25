"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Clock, GitBranch, Mail, MessageSquare, ShieldCheck, ShoppingBag, Target, DoorOpen } from "lucide-react";
import { Button, Card, Eyebrow, Gate, PageHeader, Pill } from "../ui";
import { journey, type JourneyNode } from "@/lib/demo-data";
import { cn, fmtNumber, fmtPct } from "@/lib/format";

const ICON: Record<JourneyNode["kind"], typeof Mail> = { trigger: ShoppingBag, check: ShieldCheck, wait: Clock, branch: GitBranch, email: Mail, sms: MessageSquare, ad: Target, goal: Target, exit: DoorOpen };
const byId = (id: string) => journey.nodes.find((n) => n.id === id)!;

function Chapter({ n, i, active, onSelect }: { n: JourneyNode; i: number; active: boolean; onSelect: () => void }) {
  const Icon = ICON[n.kind];
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07 }}
      onClick={onSelect}
      aria-pressed={active}
      className={cn("w-full rounded-[20px] border p-5 text-left transition", active ? "border-graphite bg-white shadow-md" : "border-parchment bg-white/50 hover:border-champagne", n.kind === "exit" && "border-dashed")}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-stone"><Icon className="h-4 w-4 text-champagne-deep" aria-hidden /> {n.kind}</span>
        <span className="font-serif text-lg tabular">{fmtNumber(n.entered)}</span>
      </div>
      <p className="mt-2 font-serif text-xl leading-snug">{n.title}</p>
      <p className="text-xs text-stone">{n.detail}</p>
    </motion.button>
  );
}

export default function Journeys() {
  const [sel, setSel] = useState("n3");
  const s = byId(sel);
  const main = ["n1", "n2", "n3", "n4", "n5"].map(byId);
  const goal = byId("n8");

  return (
    <div>
      <PageHeader
        eyebrow="Customer journeys"
        title={<>A gentle <span className="italic text-champagne-deep">return</span> to the cart</>}
        intro={`${journey.name}. ${journey.status}. Counts are from a 30-day dry run on synthetic profiles — nothing has been sent.`}
        actions={<><Button variant="ghost">Dry-run again</Button><Button variant="gold">Submit for approval</Button></>}
      />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Gate rows={6} emptyTitle="No journey drafted" emptyBody="Start from a template: welcome, abandoned cart, post-purchase or win-back.">
          <div className="relative">
            <div className="absolute bottom-10 left-6 top-6 w-px bg-gradient-to-b from-champagne via-parchment to-champagne" aria-hidden />
            <ol className="space-y-4 pl-12">
              {main.map((n, i) => (
                <li key={n.id} className="relative">
                  <span className="absolute -left-[30px] top-6 h-3 w-3 rounded-full border-2 border-ivory bg-champagne" aria-hidden />
                  <Chapter n={n} i={i} active={sel === n.id} onSelect={() => setSel(n.id)} />
                  {n.id === "n2" && (
                    <div className="mt-3 pl-6"><Chapter n={byId("n9")} i={i} active={sel === "n9"} onSelect={() => setSel("n9")} /></div>
                  )}
                </li>
              ))}
              <li className="relative">
                <span className="absolute -left-[30px] top-6 h-3 w-3 rounded-full border-2 border-ivory bg-champagne" aria-hidden />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><p className="mb-2 font-serif text-sm italic text-champagne-deep">if opened</p><Chapter n={byId("n6")} i={5} active={sel === "n6"} onSelect={() => setSel("n6")} /></div>
                  <div><p className="mb-2 font-serif text-sm italic text-champagne-deep">if not opened</p><Chapter n={byId("n7")} i={6} active={sel === "n7"} onSelect={() => setSel("n7")} /></div>
                </div>
              </li>
              <li className="relative">
                <span className="absolute -left-[32px] top-6 h-4 w-4 rounded-full bg-graphite" aria-hidden />
                <Chapter n={goal} i={7} active={sel === goal.id} onSelect={() => setSel(goal.id)} />
              </li>
            </ol>
          </div>
        </Gate>

        <div className="space-y-6 lg:sticky lg:top-40 lg:self-start">
          <Card className="p-8">
            <Eyebrow>Selected step</Eyebrow>
            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="mt-2 font-serif text-3xl">{s.title}</h2>
              <p className="mt-1 text-graphite-soft">{s.detail}</p>
              <div className="mt-6 grid grid-cols-2 gap-6">
                <div><p className="text-[11px] uppercase tracking-[0.14em] text-stone">Entered</p><p className="font-serif text-3xl tabular">{fmtNumber(s.entered)}</p></div>
                <div><p className="text-[11px] uppercase tracking-[0.14em] text-stone">Converted</p><p className="font-serif text-3xl tabular">{s.converted ? fmtNumber(s.converted) : "—"}</p><p className="text-xs text-stone">{s.converted ? fmtPct(s.converted / s.entered) + " of entrants" : "not a conversion step"}</p></div>
              </div>
            </motion.div>
          </Card>
          <Card>
            <Eyebrow>Guardrails</Eyebrow>
            <ul className="mt-3 space-y-2 text-sm text-graphite-soft">
              <li>• Consent is checked before every message step.</li>
              <li>• Frequency cap: 3 messages per profile per 7 days.</li>
              <li>• Exits immediately on purchase or opt-out.</li>
              <li>• Activation requires Owner approval; sends go through the connected ESP only.</li>
            </ul>
            <div className="mt-4 flex gap-2"><Pill tone="gold">Draft</Pill><Pill>Not sending</Pill></div>
          </Card>
        </div>
      </div>
    </div>
  );
}
