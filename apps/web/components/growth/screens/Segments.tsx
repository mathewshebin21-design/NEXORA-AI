"use client";

import { useState } from "react";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, DataTable, Delta, Gate, GRID, Panel, axisProps, growthTooltip } from "../ui";
import { lifecycle, privacyControls, segments } from "@/lib/demo-data";
import { fmtCurrency, fmtPct } from "@/lib/format";

const FIELDS = ["orders_365d", "days_since_order", "category_purchased", "email_consent", "sms_consent", "cart_started_7d", "gift_order_count"];
const BLOCKED = ["age", "gender", "ethnicity", "religion", "health_condition", "precise_location"];

export default function Segments() {
  const [sel, setSel] = useState(segments[3].id);
  const s = segments.find((x) => x.id === sel)!;
  const [rules, setRules] = useState(s.rules);
  const pick = (id: string) => { setSel(id); setRules(segments.find((x) => x.id === id)!.rules); };

  return (
    <div className="space-y-4">
      <Panel title="Segments" subtitle="First-party, consented data only · click a row to inspect">
        <Gate rows={6}>
          <DataTable
            rows={segments}
            rowKey={(r) => r.id}
            selected={sel}
            onRow={(r) => pick(r.id)}
            cols={[
              { key: "n", label: "Segment", render: (r) => <span><span className="font-medium text-white">{r.name}</span><span className="block text-[11px] text-mist">{r.id} · {r.stage}</span></span> },
              { key: "size", label: "Profiles", align: "right", render: (r) => r.size.toLocaleString(), sort: (r) => r.size },
              { key: "g", label: "MoM", align: "right", render: (r) => <Delta value={r.growth} />, sort: (r) => r.growth },
              { key: "ec", label: "Email consent", align: "right", render: (r) => fmtPct(r.emailConsent, 0), sort: (r) => r.emailConsent },
              { key: "ltv", label: "Avg LTV", align: "right", render: (r) => (r.ltv ? fmtCurrency(r.ltv) : "—"), sort: (r) => r.ltv },
              { key: "ret", label: "Retention", align: "right", render: (r) => (r.retention ? fmtPct(r.retention, 0) : "—"), sort: (r) => r.retention },
              { key: "h", label: "Health", render: (r) => <Badge tone={r.health === "strong" ? "teal" : r.health === "at-risk" ? "coral" : "slate"}>{r.health}</Badge> },
            ]}
          />
        </Gate>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={`Rule builder · ${s.name}`} subtitle="Edits create a draft; size recalculates on save against connected data">
          <ul className="space-y-2">
            {rules.map((r, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="w-8 text-[10.5px] uppercase text-mist">{i === 0 ? "where" : "and"}</span>
                <label className="sr-only" htmlFor={`f-${i}`}>Field</label>
                <select id={`f-${i}`} value={r.field} onChange={(e) => setRules((xs) => xs.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)))} className="min-w-0 flex-1 rounded-md border border-slate-line bg-midnight px-2 py-1 font-mono text-[11.5px] text-white">
                  {[...new Set([r.field, ...FIELDS])].map((f) => <option key={f}>{f}</option>)}
                </select>
                <span className="font-mono text-[11.5px] text-electric-soft">{r.op}</span>
                <label className="sr-only" htmlFor={`v-${i}`}>Value</label>
                <input id={`v-${i}`} value={r.value} onChange={(e) => setRules((xs) => xs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className="w-24 rounded-md border border-slate-line bg-midnight px-2 py-1 font-mono text-[11.5px] text-white" />
                <button onClick={() => setRules((xs) => xs.filter((_, j) => j !== i))} aria-label="Remove rule" className="grid h-7 w-7 place-items-center rounded text-mist hover:text-coral-signal"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
              </li>
            ))}
          </ul>
          <button onClick={() => setRules((xs) => [...xs, { field: "email_consent", op: "=", value: "true" }])} className="mt-3 inline-flex items-center gap-1 rounded-md border border-dashed border-slate-line px-2.5 py-1 text-[11.5px] text-mist hover:text-white"><Plus className="h-3 w-3" aria-hidden /> Add condition</button>
          <div className="mt-4 rounded-lg border border-slate-line/60 bg-midnight/40 p-3 text-[11px] text-mist">
            <p className="flex items-center gap-1 font-medium text-white"><ShieldCheck className="h-3.5 w-3.5 text-teal" aria-hidden /> Blocked attributes</p>
            <p className="mt-1 font-mono">{BLOCKED.join(" · ")}</p>
            <p className="mt-1">Not available as fields and never inferred.</p>
          </div>
        </Panel>
        <Panel title="Lifecycle distribution" subtitle="Profiles by stage">
          <Gate chart>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <BarChart data={lifecycle} margin={{ left: -10, right: 4, top: 6 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="stage" {...axisProps} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis {...axisProps} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip {...growthTooltip} cursor={{ fill: "#18264f" }} />
                  <Bar dataKey="count" name="Profiles" radius={[3, 3, 0, 0]}>
                    {lifecycle.map((l, i) => <Cell key={l.stage} fill={i >= 5 ? "#ff6b6b" : i >= 3 ? "#2ec5b6" : "#3d7bff"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Gate>
        </Panel>
        <Panel title="Privacy & consent controls" subtitle="Workspace policy">
          <ul className="space-y-2">
            {privacyControls.map((c) => (
              <li key={c.label} className="flex items-start justify-between gap-2 rounded-lg border border-slate-line/60 p-2.5">
                <span><span className="block text-[12.5px] text-white">{c.label}</span><span className="text-[11px] text-mist">{c.detail}</span></span>
                <Badge tone={c.on ? "teal" : "slate"}>{c.on ? "On" : "Off"}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
