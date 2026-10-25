"use client";

import { useState } from "react";
import { Copy, KeyRound, Plus, RefreshCw } from "lucide-react";
import { Badge, DataTable, Gate, Panel, Segmented } from "../ui";
import { auditLog, integrations, roles, team, workspaces } from "@/lib/demo-data";

type Tab = "integrations" | "members" | "usage" | "security";
const PERMS = ["View", "Edit", "Edit reports", "Approve creative", "Request spend changes", "Approve spend", "Publish", "Integrations", "Members", "Billing"];
const USAGE = [
  { k: "AI tokens (month)", used: 0, limit: 2_000_000, note: "No provider connected" },
  { k: "Connected sources", used: 0, limit: 10, note: "6 demo fixtures (not counted)" },
  { k: "Seats", used: 6, limit: 15, note: "" },
  { k: "Client workspaces", used: workspaces.length, limit: 10, note: "" },
];

export default function Settings() {
  const [tab, setTab] = useState<Tab>("integrations");
  return (
    <div className="space-y-4">
      <Segmented<Tab> label="Settings section" value={tab} onChange={setTab} options={[{ id: "integrations", label: "Integrations" }, { id: "members", label: "Members & roles" }, { id: "usage", label: "Usage" }, { id: "security", label: "Security & audit" }]} />
      {tab === "integrations" && (
        <Panel title="Integrations" subtitle="Demo fixtures stand in for real APIs; nothing is connected">
          <Gate rows={8}>
            <DataTable
              rows={integrations}
              rowKey={(r) => r.name}
              cols={[
                { key: "n", label: "Source", render: (r) => <span className="font-medium text-white">{r.name}</span> },
                { key: "c", label: "Category", render: (r) => <span className="text-mist">{r.category}</span> },
                { key: "s", label: "Status", render: (r) => <Badge tone={r.status === "Demo fixture" ? "amber" : r.status === "Error" ? "coral" : "slate"}>{r.status}</Badge> },
                { key: "sc", label: "Scopes", render: (r) => <code className="font-mono text-[11px] text-mist">{r.scopes}</code> },
                { key: "no", label: "Note", render: (r) => <span className="text-[11.5px] text-mist">{r.note}</span> },
                { key: "a", label: "", render: (r) => <button className="inline-flex items-center gap-1 rounded-md border border-slate-line px-2 py-0.5 text-[11px] text-white hover:bg-navy-3">{r.status === "Error" ? <><RefreshCw className="h-3 w-3" aria-hidden /> Reconnect</> : "Connect"}</button> },
              ]}
            />
          </Gate>
        </Panel>
      )}
      {tab === "members" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Members" actions={<button className="inline-flex items-center gap-1 rounded-md bg-electric px-2.5 py-1 text-[11.5px] text-white"><Plus className="h-3 w-3" aria-hidden /> Invite</button>}>
            <DataTable rows={team} rowKey={(r) => r.email} dense cols={[
              { key: "n", label: "Name", render: (r) => <span><span className="text-white">{r.name}</span><span className="block text-[10.5px] text-mist">{r.email}</span></span> },
              { key: "r", label: "Role", render: (r) => <Badge tone={r.role === "Owner" ? "blue" : r.role.startsWith("Client") ? "amber" : "slate"}>{r.role}</Badge> },
              { key: "l", label: "Last active", render: (r) => <span className="text-mist">{r.lastActive}</span> },
            ]} />
          </Panel>
          <Panel title="Permission matrix" subtitle="Least privilege by default">
            <div className="overflow-x-auto scrollbar-thin" tabIndex={0} role="region" aria-label="Scrollable content">
              <table className="w-full min-w-[560px] text-[11px]">
                <thead><tr><th className="pb-2 text-left text-mist">Permission</th>{roles.map((r) => <th key={r.role} className="px-1 pb-2 text-center font-medium text-mist">{r.role}</th>)}</tr></thead>
                <tbody>{PERMS.map((p) => <tr key={p} className="border-t border-slate-line/50"><td className="py-1.5 text-white">{p}</td>{roles.map((r) => <td key={r.role} className="text-center">{r.perms.includes(p) || (r.role === "Owner") ? <span className="text-teal" aria-label="allowed">●</span> : <span className="text-slate-line" aria-label="not allowed">○</span>}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
      {tab === "usage" && (
        <Panel title="Plan usage" subtitle="Subscription-ready metering · no billing provider connected">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {USAGE.map((u) => (
              <div key={u.k} className="rounded-lg border border-slate-line/60 p-3">
                <p className="text-[11px] uppercase tracking-wider text-mist">{u.k}</p>
                <p className="mt-1 font-mono text-lg text-white">{u.used.toLocaleString()} <span className="text-[12px] text-mist">/ {u.limit.toLocaleString()}</span></p>
                <div className="mt-2 h-1.5 rounded-full bg-navy-3"><div className="h-1.5 rounded-full bg-electric" style={{ width: `${(u.used / u.limit) * 100}%` }} /></div>
                {u.note && <p className="mt-1.5 text-[10.5px] text-mist">{u.note}</p>}
              </div>
            ))}
          </div>
        </Panel>
      )}
      {tab === "security" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="API credentials" actions={<button className="inline-flex items-center gap-1 rounded-md border border-slate-line px-2.5 py-1 text-[11.5px] text-white"><KeyRound className="h-3 w-3" aria-hidden /> New key</button>}>
            <ul className="space-y-2 text-[12px]">
              {[["Reporting API · read-only", "nx_live_••••7c2a", "Created Sep 2"], ["Warehouse export", "nx_live_••••19fe", "Created Aug 14"]].map(([n, k, c]) => (
                <li key={k} className="flex items-center justify-between rounded-lg border border-slate-line/60 p-2.5"><span><span className="text-white">{n}</span><span className="block text-[10.5px] text-mist">{c} · scoped to Lumen & Oak</span></span><span className="flex items-center gap-2"><code className="font-mono text-[11px]">{k}</code><Copy className="h-3.5 w-3.5 text-mist" aria-hidden /></span></li>
              ))}
            </ul>
            <p className="mt-2 text-[10.5px] text-mist">Example values only. Secrets are hashed and shown once.</p>
          </Panel>
          <Panel title="Audit log" subtitle="Immutable · exportable">
            <ul className="space-y-1.5 font-mono text-[11.5px]">
              {auditLog.map((a, i) => <li key={i} className="flex gap-3"><span className="w-16 shrink-0 text-mist">{a.at}</span><Badge tone={a.kind === "error" ? "coral" : a.kind === "ai" ? "blue" : "slate"}>{a.kind}</Badge><span className="text-white">{a.actor}</span><span className="text-mist">{a.action} → {a.target}</span></li>)}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}
