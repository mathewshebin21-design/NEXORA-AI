"use client";

import { useState } from "react";
import { CalendarClock, Download, FileDown, GripVertical } from "lucide-react";
import { Badge, DataTable, Gate, Panel } from "../ui";
import { liveCampaigns, reports } from "@/lib/demo-data";
import { roas, sumPerformance } from "@/lib/metrics";
import { fmtCompactCurrency, fmtRatio } from "@/lib/format";

const SECTIONS = ["Executive summary", "KPI scorecard", "Channel comparison", "Campaign table", "Attribution (position-based)", "Experiments", "Recommendations", "Methodology & provenance"];

function exportCsv() {
  const lines = ["# SYNTHETIC DEMO DATA — Nexora preview", "campaign_id,name,channel,spend,impressions,clicks,platform_conversions,measured_conversions,revenue"];
  liveCampaigns.forEach((c) => lines.push([c.id, `"${c.name}"`, c.channel, c.spend, c.impressions, c.clicks, c.platformConversions, c.measuredConversions, c.revenue].join(",")));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  a.download = "nexora-performance-synthetic.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Reports() {
  const [on, setOn] = useState<string[]>(SECTIONS.filter((_, i) => i !== 5));
  const t = sumPerformance(liveCampaigns);
  return (
    <div className="space-y-4">
      <Panel title="Report library" subtitle="Generated from versioned queries · provenance preserved in every export" actions={<button onClick={exportCsv} className="inline-flex items-center gap-1 rounded-md border border-slate-line px-2.5 py-1 text-[11.5px] text-white hover:bg-navy-3"><Download className="h-3.5 w-3.5" aria-hidden /> CSV</button>}>
        <Gate rows={5}>
          <DataTable
            rows={reports}
            rowKey={(r) => r.id}
            cols={[
              { key: "t", label: "Report", render: (r) => <span><span className="text-white">{r.title}</span><span className="block font-mono text-[10.5px] text-mist">{r.id}</span></span> },
              { key: "ty", label: "Type", render: (r) => <Badge>{r.type}</Badge> },
              { key: "p", label: "Period", render: (r) => <span className="text-mist">{r.period}</span> },
              { key: "pg", label: "Pages", align: "right", render: (r) => r.pages, sort: (r) => r.pages },
              { key: "s", label: "Status", render: (r) => <Badge tone={r.status === "Draft" ? "amber" : r.status === "Scheduled" ? "blue" : "teal"}>{r.status}</Badge> },
            ]}
          />
        </Gate>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Panel title="Builder" subtitle="Toggle sections">
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] hover:bg-navy-3/60">
                  <GripVertical className="h-3.5 w-3.5 text-mist" aria-hidden />
                  <input type="checkbox" checked={on.includes(s)} onChange={() => setOn((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]))} className="accent-[#3d7bff]" />
                  {s}
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2">
            <button onClick={() => window.print()} className="flex w-full items-center justify-center gap-1.5 rounded-md bg-electric py-2 text-[12px] font-medium text-white"><FileDown className="h-3.5 w-3.5" aria-hidden /> Export PDF (print)</button>
            <button className="flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-line py-2 text-[12px] text-white"><CalendarClock className="h-3.5 w-3.5" aria-hidden /> Schedule weekly · requires approval</button>
          </div>
        </Panel>
        <Panel title="Preview · Executive brief, week 43" subtitle="Lumen & Oak · Oct 19 – 24, 2026" actions={<Badge tone="amber">Synthetic</Badge>}>
          <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 text-[#0c1530] shadow-xl md:p-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-[11px] text-slate-500"><span className="font-semibold text-[#0c1530]">NEXORA · Executive brief</span><span>Prepared by Halcyon Growth Partners</span></div>
            {on.includes("Executive summary") && <section className="mt-4"><h3 className="text-sm font-bold">Executive summary</h3><p className="mt-1 text-[12.5px] leading-relaxed text-slate-700">Measured revenue {fmtCompactCurrency(t.revenue)} on {fmtCompactCurrency(t.spend)} media (ROAS {fmtRatio(roas(t.revenue, t.spend))}). Autumn Hearth leads paid social. Meta over-reports conversions by 28.7% vs matched orders; budgets use measured orders.</p></section>}
            {on.includes("KPI scorecard") && (
              <section className="mt-4 grid grid-cols-3 gap-2">
                {[["Revenue", fmtCompactCurrency(t.revenue)], ["Spend", fmtCompactCurrency(t.spend)], ["ROAS", fmtRatio(roas(t.revenue, t.spend))]].map(([k, v]) => <div key={k} className="rounded-md bg-slate-50 p-2.5"><p className="text-[10px] uppercase text-slate-500">{k}</p><p className="font-mono text-lg font-semibold">{v}</p></div>)}
              </section>
            )}
            {on.filter((s) => !["Executive summary", "KPI scorecard"].includes(s)).map((s) => (
              <section key={s} className="mt-4"><h3 className="text-sm font-bold">{s}</h3><div className="mt-1 h-10 rounded bg-slate-100" role="img" aria-label={`${s} placeholder`} /></section>
            ))}
            <p className="mt-6 border-t border-slate-200 pt-2 text-[10px] text-slate-500">Provenance: metrics computed by Nexora metric engine v0.1 from synthetic fixtures. Formulas in appendix. Query hash q-7f3a·e19c.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
