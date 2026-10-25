"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CalendarClock, FileDown, FileSpreadsheet, Send } from "lucide-react";
import { Chip, Gate, Glow, NeonButton, ScreenHeader, Title } from "../ui";
import { useAgents } from "../Shell";
import { liveCampaigns, reports } from "@/lib/demo-data";
import { roas, sumPerformance } from "@/lib/metrics";
import { cn, fmtCompactCurrency, fmtRatio } from "@/lib/format";

const SCHEDULE = [
  { d: "Mon", t: "Weekly executive brief", who: "Client: Sam Whitford", on: true },
  { d: "Wed", t: "Paid media pulse", who: "Internal team", on: true },
  { d: "1st", t: "Monthly ROI report", who: "Client + Finance", on: false },
];

export default function Dispatch() {
  const [sel, setSel] = useState(reports[0].id);
  const r = reports.find((x) => x.id === sel)!;
  const t = sumPerformance(liveCampaigns);
  const { push } = useAgents();
  const csv = () => {
    const lines = ["# SYNTHETIC DEMO DATA — Nexora preview", "id,name,spend,revenue,measured_roas"].concat(liveCampaigns.map((c) => `${c.id},"${c.name}",${c.spend},${c.revenue},${(roas(c.revenue, c.spend) ?? 0).toFixed(4)}`));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `${r.id.toLowerCase()}-synthetic.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    push(`export  ${r.id} → CSV (synthetic)`);
  };

  return (
    <div>
      <ScreenHeader code="CMD-09 · DISPATCH" title="Report dispatch" sub="Compile, verify and dispatch client reports. Every figure carries its provenance; sending to clients requires approval." />
      <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <Glow>
          <Title kicker="Queue">Dispatches</Title>
          <Gate h="h-72">
            <ol className="relative space-y-3 border-l border-rim pl-5">
              {reports.map((x, i) => (
                <motion.li key={x.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative">
                  <span className={cn("absolute -left-[27px] top-3 h-3 w-3 rounded-full border-2 border-void", x.status === "Draft" ? "bg-magenta" : x.status === "Scheduled" ? "bg-cyan" : "bg-lime-pulse")} />
                  <button onClick={() => setSel(x.id)} aria-pressed={sel === x.id} className={cn("w-full rounded-xl border p-3 text-left transition", sel === x.id ? "border-violet/60 bg-violet/10" : "border-rim hover:border-violet/40")}>
                    <div className="flex items-center justify-between"><span className="font-mono text-[10px] text-haze">{x.id} · {x.pages}pp</span><Chip tone={x.status === "Draft" ? "magenta" : x.status === "Scheduled" ? "cyan" : "lime"}>{x.status}</Chip></div>
                    <p className="mt-1 text-sm font-semibold text-white">{x.title}</p>
                    <p className="font-mono text-[10.5px] text-haze">{x.type} · {x.period}</p>
                  </button>
                </motion.li>
              ))}
            </ol>
          </Gate>
        </Glow>
        <Glow active>
          <Title kicker={`${r.type} · ${r.period}`} right={<div className="flex gap-2"><NeonButton variant="ghost" onClick={csv}><FileSpreadsheet className="h-4 w-4" aria-hidden /> CSV</NeonButton><NeonButton variant="ghost" onClick={() => window.print()}><FileDown className="h-4 w-4" aria-hidden /> PDF</NeonButton></div>}>{r.title}</Title>
          <div className="grid grid-cols-3 gap-3">
            {[["Revenue", fmtCompactCurrency(t.revenue)], ["Spend", fmtCompactCurrency(t.spend)], ["ROAS", fmtRatio(roas(t.revenue, t.spend))]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-rim bg-void/60 p-3"><p className="font-mono text-[10px] text-haze">{k}</p><p className="font-mono text-2xl text-white">{v}</p></div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-rim bg-void/60 p-4 font-mono text-[11px] leading-relaxed text-haze">
            <p className="text-cyan">// provenance manifest</p>
            <p>revenue  ← commerce.orders · matched · fixture=synthetic</p>
            <p>spend    ← ad_platform.daily_spend · 3 sources · fixture=synthetic</p>
            <p>roas     = revenue ÷ spend · engine v0.1 · tests ✓ (preview)</p>
            <p>generated 2026-10-24T10:42Z · hash e19c…7f3a</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <NeonButton onClick={() => push(`dispatch  ${r.id} → approval requested from Owner`)}><Send className="h-4 w-4" aria-hidden /> Request approval to send</NeonButton>
          </div>
        </Glow>
      </div>
      <Glow className="mt-5">
        <Title kicker="Cadence">Scheduled dispatches</Title>
        <ul className="grid gap-3 md:grid-cols-3">
          {SCHEDULE.map((s) => (
            <li key={s.t} className="flex items-center gap-3 rounded-xl border border-rim p-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet/15 font-mono text-xs text-violet-soft">{s.d}</span>
              <span className="flex-1"><span className="block text-sm text-white">{s.t}</span><span className="text-xs text-haze">{s.who}</span></span>
              <CalendarClock className={cn("h-4 w-4", s.on ? "text-lime-pulse" : "text-haze")} aria-label={s.on ? "active" : "paused"} />
            </li>
          ))}
        </ul>
      </Glow>
    </div>
  );
}
