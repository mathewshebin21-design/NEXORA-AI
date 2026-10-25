"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Circle, Plus } from "lucide-react";
import { ArtPlate } from "../ArtPlate";
import { Button, Card, Eyebrow, Gate, PageHeader, Pill, Rule } from "../ui";
import { campaignDraft, campaigns } from "@/lib/demo-data";
import { cn, fmtCurrency, fmtPct, fmtRatio } from "@/lib/format";
import { roas } from "@/lib/metrics";

const STEPS = ["Objective", "Audience", "Message", "Channels & budget", "Measurement", "Launch"];

export default function Campaigns() {
  const [step, setStep] = useState(3);
  const [mix, setMix] = useState(() => Object.fromEntries(campaignDraft.channelMix.map((m) => [m.channel, Math.round(m.share * 100)])));
  const totalShare = Object.values(mix).reduce((a, b) => a + b, 0);
  const newCustomers = useMemo(() => Math.round(campaignDraft.budget / 42), []);

  return (
    <div>
      <PageHeader
        eyebrow="Campaign briefs"
        title={<>Holiday Gifting <span className="italic text-champagne-deep">2026</span></>}
        intro={`${campaignDraft.objective} · ${campaignDraft.dates} · ${fmtCurrency(campaignDraft.budget)} proposed budget`}
        actions={<><Button variant="ghost"><Plus className="h-4 w-4" aria-hidden /> New brief</Button><Button variant="gold">Request approval</Button></>}
      />

      <nav aria-label="Brief progress" className="mt-8 overflow-x-auto no-scrollbar">
        <ol className="flex min-w-max gap-2">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined} className={cn("flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition", step === i ? "border-graphite bg-graphite text-ivory" : i < step ? "border-champagne bg-champagne-soft" : "border-parchment text-stone")}>
                {i < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : <span className="font-serif text-xs">{i + 1}</span>} {s}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-8">
          <Eyebrow>Step {step + 1} · {STEPS[step]}</Eyebrow>
          <Gate rows={5} className="mt-5">
            {step === 3 ? (
              <div>
                <p className="font-serif text-2xl">Shape the channel mix</p>
                <p className="mt-1 text-sm text-stone">Suggestions start from measured Q3 efficiency. Adjust freely — totals must reach 100%.</p>
                <div className="mt-6 space-y-5">
                  {Object.entries(mix).map(([ch, v]) => (
                    <div key={ch}>
                      <div className="flex items-baseline justify-between text-sm">
                        <label htmlFor={`mix-${ch}`}>{ch}</label>
                        <span className="tabular">{v}% · {fmtCurrency((campaignDraft.budget * v) / 100)}</span>
                      </div>
                      <input id={`mix-${ch}`} type="range" min={0} max={80} value={v} onChange={(e) => setMix((m) => ({ ...m, [ch]: Number(e.target.value) }))} className="mt-2 w-full accent-[#9c7e45]" />
                    </div>
                  ))}
                </div>
                <p className={cn("mt-6 rounded-xl px-4 py-3 text-sm", totalShare === 100 ? "bg-[#e3e8dc] text-[#4d5a41]" : "bg-[#f1ddd8] text-rosewood")} role="status">
                  Allocation totals {totalShare}% {totalShare === 100 ? "— balanced." : "— adjust to reach 100% before approval."}
                </p>
              </div>
            ) : step === 2 ? (
              <ol className="space-y-4">
                {campaignDraft.messaging.map((m, i) => (
                  <li key={m.level} className={cn("rounded-2xl border border-parchment p-5", i === 0 && "bg-ivory-deep")}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-stone">{m.level}</p>
                    <p className={cn("mt-1 font-serif", i === 0 ? "text-3xl" : "text-xl")}>{m.text}</p>
                  </li>
                ))}
              </ol>
            ) : step === 4 ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-[0.14em] text-stone"><th className="pb-2">KPI</th><th className="pb-2">Target</th><th className="pb-2">Basis</th></tr></thead>
                <tbody>
                  {campaignDraft.kpis.map((k) => (
                    <tr key={k.kpi} className="border-t border-parchment"><td className="py-3 font-medium">{k.kpi}</td><td className="py-3 font-serif text-lg">{k.target}</td><td className="py-3 text-xs text-stone">{k.basis}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : step === 5 ? (
              <ul className="space-y-3">
                {campaignDraft.checklist.map((c) => (
                  <li key={c.item} className="flex items-center gap-3 text-sm">
                    {c.done ? <Check className="h-5 w-5 rounded-full bg-sage p-1 text-ivory" aria-hidden /> : <Circle className="h-5 w-5 text-stone" aria-hidden />}
                    <span className={c.done ? "" : "text-graphite-soft"}>{c.item}</span>
                    <span className="sr-only">{c.done ? "complete" : "outstanding"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-3 text-[15px] leading-relaxed text-graphite-soft">
                <p className="font-serif text-2xl text-graphite">{step === 0 ? campaignDraft.objective : step === 1 ? "Gift Senders and Loyal Hosts" : ""}</p>
                <p>{step === 0 ? `Acquire ~${newCustomers.toLocaleString()} new customers at a measured CAC at or under $42 (budget ÷ target CAC — a planning identity, not a forecast).` : "Built only from first-party, consented segments. Look-alike exports remain disabled pending DPA review."}</p>
              </div>
            )}
          </Gate>
          <div className="mt-8 flex justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
            <Button disabled={step === STEPS.length - 1} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Continue</Button>
          </div>
        </Card>
        <div className="space-y-6">
          <ArtPlate variant={5} title="Holiday Gifting mood" className="aspect-[4/3] rounded-[22px]" />
          <Card>
            <Eyebrow>Budget split</Eyebrow>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full">
              {Object.entries(mix).map(([ch, v], i) => (
                <motion.span key={ch} layout className="h-full" style={{ width: `${(v / Math.max(totalShare, 1)) * 100}%`, background: ["#23211e", "#9c7e45", "#c8a96a", "#7d8b6f"][i] }} />
              ))}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-graphite-soft">
              {Object.entries(mix).map(([ch, v], i) => (
                <li key={ch} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: ["#23211e", "#9c7e45", "#c8a96a", "#7d8b6f"][i] }} />{ch} {fmtPct(v / 100, 0)}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Rule label="All campaigns" />
      <Gate rows={4}>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-stone">
                <th className="pb-3 font-medium">Campaign</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Window</th><th className="pb-3 text-right font-medium">Budget</th><th className="pb-3 text-right font-medium">Spent</th><th className="pb-3 text-right font-medium">Measured ROAS</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-t border-parchment">
                  <td className="py-4"><p className="font-serif text-lg">{c.name}</p><p className="text-xs text-stone">{c.id} · {c.platform} · {c.owner}</p></td>
                  <td><Pill tone={c.status === "Live" ? "sage" : c.status === "Paused" ? "rose" : "neutral"}>{c.status}</Pill></td>
                  <td className="text-xs text-graphite-soft">{c.start} → {c.end}</td>
                  <td className="text-right tabular">{fmtCurrency(c.budget)}</td>
                  <td className="text-right tabular">{fmtCurrency(c.spend)}</td>
                  <td className="text-right font-serif text-lg tabular">{fmtRatio(roas(c.revenue, c.spend))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Gate>
    </div>
  );
}
