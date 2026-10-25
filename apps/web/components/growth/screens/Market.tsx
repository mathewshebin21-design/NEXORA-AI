"use client";

import { useState } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { Badge, DataTable, Gate, GRID, Panel, Segmented, axisProps, growthTooltip } from "../ui";
import { competitors, findings, integrations, searchQueries, type Finding } from "@/lib/demo-data";
import { ctr } from "@/lib/metrics";
import { fmtPct } from "@/lib/format";

type Basis = "All" | Finding["basis"];

export default function Market() {
  const [basis, setBasis] = useState<Basis>("All");
  const sources = integrations.filter((i) => ["SEO", "Analytics", "Commerce"].includes(i.category));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Search demand" subtitle="Source: uploaded Search Console export (synthetic) · keyword volumes from paid providers not connected">
          <Gate rows={6}>
            <DataTable
              rows={searchQueries}
              rowKey={(r) => r.query}
              cols={[
                { key: "q", label: "Query", render: (r) => <span className="text-white">{r.query}</span> },
                { key: "i", label: "Intent", render: (r) => <Badge tone={r.intent === "Commercial" ? "blue" : r.intent === "Informational" ? "teal" : "slate"}>{r.intent}</Badge> },
                { key: "clicks", label: "Clicks", align: "right", render: (r) => r.clicks.toLocaleString(), sort: (r) => r.clicks },
                { key: "impr", label: "Impr.", align: "right", render: (r) => r.impressions.toLocaleString(), sort: (r) => r.impressions },
                { key: "ctr", label: "CTR", align: "right", render: (r) => fmtPct(ctr(r.clicks, r.impressions), 2), sort: (r) => ctr(r.clicks, r.impressions) ?? 0 },
                { key: "pos", label: "Avg pos.", align: "right", render: (r) => r.position.toFixed(1), sort: (r) => -r.position },
              ]}
            />
          </Gate>
        </Panel>
        <Panel title="Opportunity map" subtitle="Impressions vs average position — high impressions + low rank = content opportunity">
          <Gate chart>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <ScatterChart margin={{ left: -6, right: 10, top: 10 }}>
                  <CartesianGrid stroke={GRID} />
                  <XAxis type="number" dataKey="position" name="Avg position" reversed {...axisProps} domain={[0, 20]} />
                  <YAxis type="number" dataKey="impressions" name="Impressions" {...axisProps} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <ZAxis type="number" dataKey="clicks" range={[60, 600]} name="Clicks" />
                  <Tooltip {...growthTooltip} cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={searchQueries} fill="#3d7bff" fillOpacity={0.7} stroke="#8fb2ff" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Gate>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <Panel title="Competitive positioning" subtitle="Public website review (synthetic) · spend & share of voice not estimated">
          <Gate rows={4}>
            <DataTable
              rows={competitors}
              rowKey={(r) => r.name}
              cols={[
                { key: "n", label: "Competitor", render: (r) => <span className="font-medium text-white">{r.name}</span> },
                { key: "p", label: "Positioning", render: (r) => <span className="text-mist">{r.positioning}</span> },
                { key: "h", label: "Hero claim", render: (r) => <span className="italic">“{r.heroClaim}”</span> },
                { key: "pi", label: "Price idx", align: "right", render: (r) => r.priceIndex.toFixed(2), sort: (r) => r.priceIndex },
                { key: "sov", label: "SoV", align: "right", render: () => <span className="text-mist">n/c</span> },
              ]}
            />
          </Gate>
        </Panel>
        <Panel
          title="Findings ledger"
          subtitle="Every claim tagged by basis, with its source"
          actions={<Segmented<Basis> label="Finding basis" value={basis} onChange={setBasis} options={[{ id: "All", label: "All" }, { id: "Evidence", label: "Evidence" }, { id: "Assumption", label: "Assumption" }, { id: "Recommendation", label: "Rec." }]} />}
        >
          <Gate rows={5}>
            <ul className="divide-y divide-slate-line/60">
              {findings.filter((f) => basis === "All" || f.basis === basis).map((f) => (
                <li key={f.id} className="grid gap-1 py-2.5 sm:grid-cols-[110px_1fr]">
                  <div className="flex gap-1 sm:flex-col sm:items-start"><Badge tone={f.basis === "Evidence" ? "teal" : f.basis === "Assumption" ? "amber" : "blue"}>{f.basis}</Badge><span className="text-[10.5px] text-mist">{f.area}</span></div>
                  <div>
                    <p className="text-[12.5px] text-white">{f.claim}</p>
                    <p className="text-[11px] text-mist">{f.detail}</p>
                    <p className="mt-0.5 font-mono text-[10.5px] text-electric-soft">↳ {f.source}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Gate>
        </Panel>
      </div>

      <Panel title="Source coverage" subtitle="What this workspace can and cannot see">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {sources.map((s) => (
            <div key={s.name} className="rounded-lg border border-slate-line/60 p-3">
              <div className="flex items-center justify-between"><span className="text-[12.5px] font-medium text-white">{s.name}</span><Badge tone={s.status === "Demo fixture" ? "amber" : s.status === "Error" ? "coral" : "slate"}>{s.status}</Badge></div>
              <p className="mt-1 text-[11px] text-mist">{s.note}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
