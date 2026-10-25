"use client";

import { Panel } from "@/components/growth/ui";
import type { Usage as UsageT } from "@/lib/api/types";
import { cn } from "@/lib/format";
import { useApp } from "../AppContext";
import { PageTitle } from "../AppShell";
import { Notice, Spinner } from "../forms";
import { useResource } from "../useResource";

const LABELS: Record<string, { label: string; note: string }> = {
  seats: { label: "Seats", note: "Members plus pending invitations" },
  workspaces: { label: "Client workspaces", note: "Active (not deleted)" },
  api_requests_month: { label: "API requests this month", note: "Metered per /v1 call" },
  ai_tokens_month: { label: "AI tokens this month", note: "No AI provider connected yet" },
};

export default function Usage() {
  const { org } = useApp();
  const { data, error, loading } = useResource<UsageT>(`/orgs/${org.id}/usage`);
  return (
    <div className="space-y-4">
      <PageTitle title="Plan & usage" subtitle="Subscription-ready metering. No billing provider is connected, so nothing is charged." />
      {loading && !data ? <Spinner /> : error ? <Notice tone="error">{error}</Notice> : data && (
        <>
          <Panel title={`Plan: ${data.plan}`} subtitle={`Billing period ${new Date(data.period_start).toLocaleDateString()} – ${new Date(data.period_end).toLocaleDateString()}`}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {data.metrics.map((m) => {
                const pct = m.limit ? Math.min(1, m.used / m.limit) : 0;
                const info = LABELS[m.metric] ?? { label: m.metric, note: "" };
                return (
                  <div key={m.metric} className="rounded-lg border border-slate-line/60 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-mist">{info.label}</p>
                    <p className="mt-1 font-mono text-lg text-white">{m.used.toLocaleString()} <span className="text-[12px] text-mist">/ {m.limit === null ? "unlimited" : m.limit.toLocaleString()}</span></p>
                    <div className="mt-2 h-1.5 rounded-full bg-navy-3" role="progressbar" aria-label={info.label} aria-valuenow={m.used} aria-valuemin={0} aria-valuemax={m.limit ?? undefined}>
                      <div className={cn("h-1.5 rounded-full", pct >= 1 ? "bg-coral-signal" : pct >= 0.8 ? "bg-amber-signal" : "bg-electric")} style={{ width: `${pct * 100}%` }} />
                    </div>
                    <p className="mt-1.5 text-[10.5px] text-mist">{info.note}</p>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Notice tone="info">Plan tiers and limits are placeholders for pricing research (see docs). Limits are enforced: inviting beyond the seat limit or creating workspaces beyond the cap is blocked.</Notice>
        </>
      )}
    </div>
  );
}
