"use client";

import { useState } from "react";
import { AlertCircle, KeyRound, Plug, ShieldCheck, UserPlus } from "lucide-react";
import { Button, Card, Eyebrow, Gate, PageHeader, Pill } from "../ui";
import { auditLog, integrations, roles, team } from "@/lib/demo-data";
import { cn } from "@/lib/format";

const TABS = ["Integrations", "Members & roles", "Brand & workspace", "Security & audit"] as const;

export default function House() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Integrations");
  return (
    <div>
      <PageHeader eyebrow="House settings" title={<>The <span className="italic text-champagne-deep">house</span> rules</>} intro="Workspace configuration for Lumen & Oak. Data in this workspace is isolated from other clients." />
      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Settings sections">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-full border px-4 py-1.5 text-sm", tab === t ? "border-graphite bg-graphite text-ivory" : "border-parchment hover:border-champagne")}>{t}</button>)}
      </div>

      <div className="mt-8">
        {tab === "Integrations" && (
          <Gate rows={6}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {integrations.map((i) => (
                <Card key={i.name} className={cn("p-5", i.status === "Error" && "border-rosewood/40")}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-ivory-deep font-serif text-sm">{i.name.slice(0, 2)}</span>
                      <div><p className="font-medium">{i.name}</p><p className="text-xs text-stone">{i.category}</p></div>
                    </div>
                    <Pill tone={i.status === "Demo fixture" ? "gold" : i.status === "Error" ? "rose" : "neutral"}>{i.status}</Pill>
                  </div>
                  <p className="mt-3 text-sm text-graphite-soft">{i.note}</p>
                  <p className="mt-2 text-xs text-stone">Scopes: {i.scopes}</p>
                  <Button variant={i.status === "Error" ? "solid" : "ghost"} className="mt-4 w-full">
                    {i.status === "Error" ? <><AlertCircle className="h-4 w-4" aria-hidden /> Reconnect</> : <><Plug className="h-4 w-4" aria-hidden /> {i.status === "Demo fixture" ? "Configure OAuth" : "Connect"}</>}
                  </Button>
                </Card>
              ))}
            </div>
          </Gate>
        )}
        {tab === "Members & roles" && (
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <div className="flex items-center justify-between"><Eyebrow>Members</Eyebrow><Button variant="ghost"><UserPlus className="h-4 w-4" aria-hidden /> Invite</Button></div>
              <ul className="mt-4 divide-y divide-parchment">
                {team.map((m) => (
                  <li key={m.email} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-graphite font-serif text-xs text-ivory">{m.name.split(" ").map((p) => p[0]).slice(-2).join("")}</span>
                      <div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-stone">{m.email}</p></div>
                    </div>
                    <label className="sr-only" htmlFor={`role-${m.email}`}>Role for {m.name}</label>
                    <select id={`role-${m.email}`} defaultValue={m.role} className="rounded-full border border-parchment bg-transparent px-3 py-1 text-sm">
                      {roles.map((r) => <option key={r.role}>{r.role}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <Eyebrow>Role permissions</Eyebrow>
              <ul className="mt-4 space-y-4">{roles.map((r) => <li key={r.role}><p className="font-serif text-lg">{r.role}</p><p className="mt-1 flex flex-wrap gap-1">{r.perms.map((p) => <Pill key={p}>{p}</Pill>)}</p></li>)}</ul>
            </Card>
          </div>
        )}
        {tab === "Brand & workspace" && (
          <Card className="max-w-2xl space-y-5">
            {[["Workspace name", "Lumen & Oak"], ["Default currency", "USD"], ["Reporting timezone", "America/New_York"], ["Fiscal year start", "February"]].map(([l, v]) => (
              <div key={l}><label className="text-[11px] uppercase tracking-[0.16em] text-stone" htmlFor={l}>{l}</label><input id={l} defaultValue={v} className="mt-1 w-full rounded-xl border border-parchment bg-white px-4 py-2.5" /></div>
            ))}
            <div className="flex gap-2"><Button>Save</Button><Button variant="ghost">Export workspace data</Button><Button variant="ghost" className="text-rosewood">Request deletion</Button></div>
          </Card>
        )}
        {tab === "Security & audit" && (
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <Eyebrow>API credentials</Eyebrow>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center justify-between"><span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-champagne-deep" aria-hidden /> Reporting API (read-only)</span><code className="font-mono text-xs">nx_live_••••7c2a</code></li>
                <li className="flex items-center justify-between"><span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-champagne-deep" aria-hidden /> Warehouse export</span><code className="font-mono text-xs">nx_live_••••19fe</code></li>
              </ul>
              <p className="mt-4 flex items-center gap-2 text-xs text-stone"><ShieldCheck className="h-4 w-4" aria-hidden /> Example values. Keys are hashed at rest and shown once on creation.</p>
            </Card>
            <Card>
              <Eyebrow>Audit log</Eyebrow>
              <ol className="mt-4 space-y-3 text-sm">{auditLog.map((a, i) => <li key={i} className="flex gap-3"><span className="w-16 shrink-0 text-xs text-stone">{a.at}</span><span><strong className="font-medium">{a.actor}</strong> {a.action.toLowerCase()} <code className="font-mono text-xs">{a.target}</code></span></li>)}</ol>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
