"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FlaskConical, Link2, RefreshCw, Unplug } from "lucide-react";
import { Badge, DataTable, Panel, Segmented } from "@/components/growth/ui";
import { api } from "@/lib/api/client";
import type { ConnectionInfo, Connector, DataPreview, DataSummary, ProviderKey, SyncRun } from "@/lib/api/types";
import { cn, fmtNumber } from "@/lib/format";
import { useApp } from "../AppContext";
import { PageTitle } from "../AppShell";
import { Btn, Field, Notice, Spinner, inputCls } from "../forms";
import { useAction, useResource } from "../useResource";

const TABLES = [
  { id: "ad_daily", label: "Ad spend (daily)" },
  { id: "orders", label: "Orders" },
  { id: "web_daily", label: "Web sessions (daily)" },
] as const;
type TableId = (typeof TABLES)[number]["id"];

const PREVIEW_COLS: Record<TableId, string[]> = {
  ad_daily: ["date", "provider", "campaign_name", "impressions", "clicks", "spend", "platform_conversions", "currency"],
  orders: ["ordered_at", "order_id", "total_revenue", "currency", "utm_source", "utm_medium", "financial_status"],
  web_daily: ["date", "channel_group", "sessions", "engaged_sessions", "key_events", "purchase_revenue"],
};

const INTEGER_COLS = new Set(["impressions", "clicks", "sessions", "engaged_sessions"]);
const cell = (k: string, v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return fmtNumber(v, INTEGER_COLS.has(k) ? 0 : 2);
  if (k === "ordered_at") return String(v).replace("T", " ").slice(0, 16) + " UTC";
  return String(v);
};

const runTone = (s?: string) => (s === "succeeded" ? "teal" : s === "failed" ? "coral" : s ? "amber" : "slate") as "teal" | "coral" | "amber" | "slate";
const ago = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "never");

function ConnectorCard({ c, conn, base, canManage, canSync, onChange }: { c: Connector; conn?: ConnectionInfo; base: string; canManage: boolean; canSync: boolean; onChange: () => void }) {
  const [liveForm, setLiveForm] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [windowDays, setWindowDays] = useState(30);
  const [purge, setPurge] = useState(false);
  const action = useAction();
  const busy = conn?.latest_run && ["queued", "running"].includes(conn.latest_run.status);

  const connectSample = async () => { if (await action.run(() => api(`${base}/connections`, { method: "POST", json: { provider: c.provider, mode: "sample" } }))) onChange(); };
  const connectLive = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await action.run(() => api<{ authorize_url: string }>(`${base}/connections`, { method: "POST", json: { provider: c.provider, mode: "live", config } }));
    if (r?.authorize_url) window.location.assign(r.authorize_url);
  };
  const sync = async () => { if (await action.run(() => api(`${base}/connections/${conn!.id}/sync`, { method: "POST", json: { window_days: windowDays }, headers: { "Idempotency-Key": crypto.randomUUID() } }))) onChange(); };
  const disconnect = async () => {
    if (!confirm(`Disconnect ${c.name}?${purge ? " Its imported data will be deleted." : " Imported data is kept."} Stored tokens are destroyed either way.`)) return;
    const ok = await action.run(async () => { await api(`${base}/connections/${conn!.id}?purge_data=${purge}`, { method: "DELETE" }); return true; });
    if (ok) onChange();
  };

  return (
    <section className={cn("flex flex-col rounded-xl border bg-navy-2/70 p-4", conn ? (conn.status === "error" ? "border-coral-signal/50" : "border-electric/40") : "border-slate-line/70")} aria-label={c.name}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-semibold text-white">{c.name}</h2>
          <p className="text-[11px] text-mist">{c.category} · writes {c.produces.replace("_", " ")}</p>
        </div>
        {conn ? (
          <span className="flex flex-col items-end gap-1">
            <Badge tone={conn.mode === "sample" ? "amber" : "blue"}>{conn.mode === "sample" ? "Sample data" : "Live"}</Badge>
            <Badge tone={conn.status === "error" ? "coral" : "teal"}>{conn.status}</Badge>
          </span>
        ) : <Badge>Not connected</Badge>}
      </div>

      {action.error && <div className="mt-3"><Notice tone="error">{action.error}</Notice></div>}

      {conn ? (
        <div className="mt-3 flex flex-1 flex-col gap-3 text-[12px]">
          <dl className="grid grid-cols-2 gap-2">
            <div><dt className="text-mist">Account</dt><dd className="truncate text-white">{conn.display_name}</dd></div>
            <div><dt className="text-mist">Last sync</dt><dd className="text-white">{ago(conn.last_sync_at)}</dd></div>
            <div><dt className="text-mist">Rows</dt><dd className="font-mono text-white">{fmtNumber(conn.data.rows)}</dd></div>
            <div><dt className="text-mist">Coverage</dt><dd className="font-mono text-white">{conn.data.from ? `${conn.data.from} → ${conn.data.to}` : "—"}</dd></div>
          </dl>
          {conn.latest_run && (
            <p className="flex flex-wrap items-center gap-1.5 text-mist">Latest run <Badge tone={runTone(conn.latest_run.status)}>{conn.latest_run.status}</Badge>
              {conn.latest_run.status === "queued" && conn.latest_run.attempt > 0 && <span>retry pending</span>}
            </p>
          )}
          {conn.last_error && <p className="rounded-md bg-coral-signal/10 p-2 text-[11.5px] text-coral-signal">{conn.last_error}</p>}
          <div className="mt-auto flex flex-wrap items-end gap-2">
            {canSync && (
              <>
                <label className="sr-only" htmlFor={`win-${c.provider}`}>Sync window for {c.name}</label>
                <select id={`win-${c.provider}`} value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))} className="rounded-md border border-slate-line bg-midnight px-1.5 py-1.5 text-[11.5px] text-white">
                  <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
                </select>
                <Btn variant="ghost" onClick={sync} busy={action.busy} disabled={!!busy}><RefreshCw className="h-3.5 w-3.5" aria-hidden /> {busy ? "Syncing…" : "Sync now"}</Btn>
              </>
            )}
            {canManage && (
              <span className="ml-auto flex items-center gap-2">
                <label className="flex items-center gap-1 text-[11px] text-mist"><input type="checkbox" checked={purge} onChange={(e) => setPurge(e.target.checked)} className="accent-[#2e69ee]" /> delete data</label>
                <Btn variant="danger" onClick={disconnect}><Unplug className="h-3.5 w-3.5" aria-hidden /> Disconnect</Btn>
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-1 flex-col gap-3 text-[12px]">
          <p className="text-mist">{c.setup_note}</p>
          <p className="text-[11px] text-mist">Scopes requested: <code className="font-mono">{c.scopes.join(", ")}</code></p>
          {canManage ? (
            liveForm && c.live_available ? (
              <form onSubmit={connectLive} className="space-y-2">
                {c.config_fields.map((f) => (
                  <Field key={f.key} label={f.label} htmlFor={`${c.provider}-${f.key}`} hint={f.hint}>
                    <input id={`${c.provider}-${f.key}`} required value={config[f.key] ?? ""} onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })} className={inputCls} />
                  </Field>
                ))}
                <div className="flex gap-2"><Btn type="submit" busy={action.busy}><ExternalLink className="h-3.5 w-3.5" aria-hidden /> Continue to {c.name}</Btn><Btn variant="ghost" type="button" onClick={() => setLiveForm(false)}>Cancel</Btn></div>
              </form>
            ) : (
              <div className="mt-auto flex flex-wrap gap-2">
                <Btn onClick={() => setLiveForm(true)} disabled={!c.live_available} title={c.live_unavailable_reason ?? undefined}><Link2 className="h-3.5 w-3.5" aria-hidden /> Connect account</Btn>
                <Btn variant="ghost" onClick={connectSample} busy={action.busy}><FlaskConical className="h-3.5 w-3.5" aria-hidden /> Use sample data</Btn>
                {!c.live_available && <p className="w-full text-[11px] text-amber-signal">Live connection unavailable: {c.live_unavailable_reason}.{c.missing_settings.length ? ` Also needs ${c.missing_settings.join(", ")}.` : ""}</p>}
              </div>
            )
          ) : <p className="mt-auto text-[11px] text-mist">Ask a workspace admin to connect this source.</p>}
          <a href={c.docs_url} target="_blank" rel="noreferrer" className="text-[11px] text-electric-soft hover:underline">Provider API documentation ↗</a>
        </div>
      )}
    </section>
  );
}

export default function DataSources() {
  const { org, workspace, canWs } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const base = `/orgs/${org.id}/workspaces/${workspace!.id}`;
  const catalog = useResource<Connector[]>("/connectors");
  const conns = useResource<ConnectionInfo[]>(`${base}/connections`);
  const summary = useResource<DataSummary>(`${base}/data-summary`);
  const [table, setTable] = useState<TableId>("ad_daily");
  const preview = useResource<DataPreview>(`${base}/data/${table}?limit=25`);
  const [runsFor, setRunsFor] = useState<string | null>(null);
  const runs = useResource<SyncRun[]>(runsFor ? `${base}/connections/${runsFor}/runs` : null);
  const byProvider = useMemo(() => Object.fromEntries((conns.data ?? []).map((c) => [c.provider, c])) as Partial<Record<ProviderKey, ConnectionInfo>>, [conns.data]);
  const active = (conns.data ?? []).some((c) => c.latest_run && ["queued", "running"].includes(c.latest_run.status));
  const connected = params.get("connected");
  const error = params.get("error");

  const refreshAll = () => { conns.reload(); summary.reload(); preview.reload(); if (runsFor) runs.reload(); };
  useEffect(() => {
    if (!active) return;
    const t = setInterval(refreshAll, 2000);
    return () => clearInterval(t);
  }, [active, runsFor]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!runsFor && conns.data?.length) setRunsFor(conns.data[0].id); }, [conns.data, runsFor]);

  const s = summary.data;
  const totalRows = s ? s.ad_daily.rows + s.orders.rows + s.web_daily.rows : 0;
  const synthRows = s ? s.ad_daily.synthetic_rows + s.orders.synthetic_rows + s.web_daily.synthetic_rows : 0;

  return (
    <div className="space-y-4">
      <PageTitle title="Data sources" subtitle={`Authorised, read-only connections for ${workspace!.name}. Every imported row keeps its source, sync run and synthetic flag.`} />
      {connected && <Notice tone="success">Connected {connected.replace("_", " ")}. The first sync has been queued. <button className="underline" onClick={() => router.replace(`/app/${org.id}/w/${workspace!.id}/data`)}>Dismiss</button></Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid gap-3 md:grid-cols-3">
        {TABLES.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-line/70 bg-navy-2/70 p-3">
            <p className="text-[11px] uppercase tracking-wider text-mist">{t.label}</p>
            <p className="mt-1 font-mono text-xl text-white">{s ? fmtNumber(s[t.id].rows) : "—"} <span className="text-[11px] text-mist">rows</span></p>
            <p className="text-[11px] text-mist">{s?.[t.id].from ? `${s[t.id].from} → ${s[t.id].to}` : "no data yet"}{s && s[t.id].synthetic_rows > 0 && <> · <span className="text-amber-signal">{fmtNumber(s[t.id].synthetic_rows)} synthetic</span></>}</p>
          </div>
        ))}
      </div>
      {totalRows > 0 && synthRows === totalRows && <Notice tone="warn">All data in this workspace is synthetic sample data. Connect live accounts to measure real performance.</Notice>}

      {catalog.loading && !catalog.data ? <Spinner /> : catalog.error ? <Notice tone="error">{catalog.error}</Notice> : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {(catalog.data ?? []).map((c) => (
            <ConnectorCard key={c.provider} c={c} conn={byProvider[c.provider]} base={base} canManage={canWs("connections.manage")} canSync={canWs("sync.run")} onChange={refreshAll} />
          ))}
        </div>
      )}

      {(conns.data?.length ?? 0) > 0 && (
        <Panel
          title="Sync history"
          subtitle="Runs retry transient provider errors with exponential backoff (max 3 attempts). Re-syncing a window replaces rows; it never duplicates them."
          actions={
            <label className="flex items-center gap-1.5 text-[11.5px] text-mist">Source
              <select value={runsFor ?? ""} onChange={(e) => setRunsFor(e.target.value)} className="rounded-md border border-slate-line bg-midnight px-1.5 py-0.5 text-[11.5px] text-white">
                {(conns.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
              </select>
            </label>
          }
        >
          {runs.loading && !runs.data ? <Spinner /> : (
            <DataTable rows={runs.data ?? []} rowKey={(r) => r.id} dense cols={[
              { key: "s", label: "Status", render: (r) => <Badge tone={runTone(r.status)}>{r.status}</Badge> },
              { key: "t", label: "Trigger", render: (r) => <span className="text-mist">{r.trigger}</span> },
              { key: "w", label: "Window", render: (r) => <span className="font-mono text-[11px]">{r.window_start} → {r.window_end}</span> },
              { key: "a", label: "Attempt", align: "right", render: (r) => `${r.attempt}/${r.max_attempts}` },
              { key: "n", label: "Rows", align: "right", render: (r) => fmtNumber(r.records_upserted) },
              { key: "d", label: "Duration", align: "right", render: (r) => (r.duration_s !== null ? `${r.duration_s.toFixed(1)}s` : "—") },
              { key: "c", label: "Requested", render: (r) => <span className="text-mist">{new Date(r.created_at).toLocaleString()}</span> },
              { key: "e", label: "Error", render: (r) => (r.error ? <span className="text-[11px] text-coral-signal">{r.error}</span> : null) },
            ]} />
          )}
        </Panel>
      )}

      <Panel title="Imported data preview" subtitle="Latest 25 rows · raw values as received (no metrics applied) · lineage columns show where each row came from"
        actions={<Segmented<TableId> label="Table" value={table} onChange={setTable} options={TABLES.map((t) => ({ id: t.id, label: t.label.split(" (")[0] }))} />}>
        {preview.loading && !preview.data ? <Spinner /> : preview.error ? <Notice tone="error">{preview.error}</Notice> : !preview.data?.rows.length ? (
          <p className="py-6 text-center text-[12.5px] text-mist">No rows in this table yet.</p>
        ) : (
          <DataTable rows={preview.data.rows} rowKey={(r) => `${r.connection_id}-${PREVIEW_COLS[table].map((k) => r[k]).join("-")}`} dense cols={[
            ...PREVIEW_COLS[table].map((k) => ({ key: k, label: k.replace(/_/g, " "), align: typeof preview.data!.rows[0][k] === "number" ? ("right" as const) : undefined,
              render: (r: Record<string, unknown>) => <span className={k.includes("name") || k.includes("group") ? "text-white" : ""}>{cell(k, r[k])}</span> })),
            { key: "lineage", label: "Lineage", render: (r) => <span className="flex items-center gap-1 font-mono text-[10.5px] text-mist">run {String(r.sync_run_id).slice(0, 8)} {r.is_synthetic ? <Badge tone="amber">synthetic</Badge> : <Badge tone="teal">live</Badge>}</span> },
          ]} />
        )}
      </Panel>
    </div>
  );
}
