"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Download, FileText, Share2 } from "lucide-react";
import { ArtPlate } from "../ArtPlate";
import { Button, Card, Eyebrow, Gate, PageHeader, Pill } from "../ui";
import { liveCampaigns, reports } from "@/lib/demo-data";
import { roas, sumPerformance } from "@/lib/metrics";
import { cn, fmtCompactCurrency, fmtRatio } from "@/lib/format";

function toCsv() {
  const header = "campaign_id,name,channel,spend,measured_conversions,revenue,measured_roas";
  const rows = liveCampaigns.map((c) => [c.id, `"${c.name}"`, c.channel, c.spend, c.measuredConversions, c.revenue, (roas(c.revenue, c.spend) ?? 0).toFixed(4)].join(","));
  return "# SYNTHETIC DEMO DATA — Nexora preview\n" + [header, ...rows].join("\n");
}

export default function Editions() {
  const [sel, setSel] = useState(reports[0].id);
  const r = reports.find((x) => x.id === sel)!;
  const t = sumPerformance(liveCampaigns);
  const download = () => {
    const blob = new Blob([toCsv()], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nexora-campaigns-synthetic.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Editions"
        title={<>Reports, set like a <span className="italic text-champagne-deep">publication</span></>}
        intro="Client-ready editions that keep every number traceable to its source and formula."
        actions={<><Button variant="ghost" onClick={download}><Download className="h-4 w-4" aria-hidden /> Export CSV</Button><Button onClick={() => window.print()}><FileText className="h-4 w-4" aria-hidden /> Print / PDF</Button></>}
      />
      <div className="mt-10 grid gap-10 lg:grid-cols-[320px_1fr]">
        <Gate rows={5} emptyTitle="No editions yet" emptyBody="Create your first report from a template.">
          <ul className="space-y-2">
            {reports.map((x) => (
              <li key={x.id}>
                <button onClick={() => setSel(x.id)} aria-current={sel === x.id} className={cn("w-full rounded-2xl border p-4 text-left transition", sel === x.id ? "border-graphite bg-white" : "border-parchment hover:border-champagne")}>
                  <p className="font-serif text-lg leading-snug">{x.title}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-stone">{x.type} · {x.period}</p>
                  <div className="mt-2"><Pill tone={x.status === "Draft" ? "gold" : x.status.startsWith("Shared") ? "sage" : "neutral"}>{x.status}</Pill></div>
                </button>
              </li>
            ))}
          </ul>
        </Gate>

        <motion.article key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-parchment bg-white p-6 shadow-sm md:p-12">
          <div className="flex items-center justify-between text-xs text-stone">
            <span>Lumen &amp; Oak · prepared by Halcyon Growth Partners</span><span>{r.id} · {r.pages} pp.</span>
          </div>
          <h2 className="mt-8 font-serif text-5xl leading-[1.02] tracking-tight">{r.title}</h2>
          <p className="mt-3 font-serif text-xl italic text-champagne-deep">{r.period}</p>
          <ArtPlate variant={4} className="mt-8 aspect-[21/9] rounded-[20px]" />
          <div className="mt-10 grid gap-10 md:grid-cols-[1fr_1.3fr]">
            <div className="space-y-6">
              <div><Eyebrow>Measured revenue</Eyebrow><p className="font-serif text-4xl tabular">{fmtCompactCurrency(t.revenue)}</p></div>
              <div><Eyebrow>Media spend</Eyebrow><p className="font-serif text-4xl tabular">{fmtCompactCurrency(t.spend)}</p></div>
              <div><Eyebrow>Measured ROAS</Eyebrow><p className="font-serif text-4xl tabular">{fmtRatio(roas(t.revenue, t.spend))}</p></div>
            </div>
            <div className="space-y-4 text-[15px] leading-relaxed text-graphite-soft">
              <p className="font-serif text-2xl leading-snug text-graphite">Autumn Hearth carried the season; non-brand cookware needs a sharper keyword set.</p>
              <p>Paid social and brand search generated most measured revenue. Meta-reported conversions exceeded matched orders by 28.7% on Autumn Hearth; all figures in this edition use matched orders.</p>
              <p>We recommend a holdout test before scaling video prospecting, and a consent-aware win-back for the lapsing cohort.</p>
              <Card className="bg-ivory-deep p-4 text-xs">
                <p className="font-semibold text-graphite">Provenance</p>
                <p className="mt-1">Revenue: commerce.orders (synthetic fixture), matched by order ID. Spend: ad platform exports (synthetic). ROAS = revenue ÷ spend. Generated 2026-10-24 10:42 UTC.</p>
              </Card>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-2 border-t border-parchment pt-6">
            <Button variant="ghost"><Share2 className="h-4 w-4" aria-hidden /> Share with client (requires approval)</Button>
          </div>
        </motion.article>
      </div>
    </div>
  );
}
