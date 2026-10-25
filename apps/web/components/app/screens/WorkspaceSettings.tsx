"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { Badge, DataTable, Panel, Segmented } from "@/components/growth/ui";
import { api, downloadExport } from "@/lib/api/client";
import { WORKSPACE_ROLES, roleLabel, type ApiKey, type ApiKeyCreated, type Member, type WorkspaceMember, type WorkspaceRole, type WorkspaceSettings as WSettings } from "@/lib/api/types";
import { useApp } from "../AppContext";
import { PageTitle } from "../AppShell";
import { AuditTable } from "../AuditTable";
import { Btn, Field, Notice, Spinner, inputCls } from "../forms";
import { useAction, useResource } from "../useResource";

type Tab = "general" | "members" | "keys" | "audit" | "data";
const SCOPES = [
  { id: "workspace:read", label: "Read workspace" },
  { id: "projects:read", label: "Read projects" },
  { id: "projects:write", label: "Write projects" },
  { id: "audit:read", label: "Read audit log" },
];
const DEFAULTS: WSettings = { currency: "USD", timezone: "UTC", fiscal_year_start_month: 1, default_attribution_model: "position_based", data_retention_months: 25, brand_name: "" };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function General() {
  const { org, workspace, canWs, refresh } = useApp();
  const ws = workspace!;
  const [name, setName] = useState(ws.name);
  const [s, setS] = useState<WSettings>({ ...DEFAULTS, ...ws.settings });
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const editable = canWs("workspace.update");
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    if (await action.run(() => api(`/orgs/${org.id}/workspaces/${ws.id}`, { method: "PATCH", json: { name, settings: s } }))) { setSaved(true); refresh(); }
  };
  return (
    <Panel title="General" subtitle="Changes are validated server-side and recorded in the audit log with before/after values.">
      <form onSubmit={save} className="grid max-w-3xl gap-4 md:grid-cols-2">
        {action.error && <div className="md:col-span-2"><Notice tone="error">{action.error}</Notice></div>}
        {saved && <div className="md:col-span-2"><Notice tone="success">Settings saved.</Notice></div>}
        <Field label="Workspace name" htmlFor="ws-name"><input id="ws-name" disabled={!editable} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
        <Field label="Client brand name" htmlFor="ws-brand"><input id="ws-brand" disabled={!editable} value={s.brand_name} onChange={(e) => setS({ ...s, brand_name: e.target.value })} className={inputCls} /></Field>
        <Field label="Reporting currency" htmlFor="ws-cur" hint="ISO 4217 code, e.g. USD, EUR, GBP"><input id="ws-cur" disabled={!editable} maxLength={3} value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value.toUpperCase() })} className={inputCls} /></Field>
        <Field label="Reporting timezone" htmlFor="ws-tz"><input id="ws-tz" disabled={!editable} value={s.timezone} onChange={(e) => setS({ ...s, timezone: e.target.value })} className={inputCls} /></Field>
        <Field label="Fiscal year starts" htmlFor="ws-fy">
          <select id="ws-fy" disabled={!editable} value={s.fiscal_year_start_month} onChange={(e) => setS({ ...s, fiscal_year_start_month: Number(e.target.value) })} className={inputCls}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Default attribution model" htmlFor="ws-attr">
          <select id="ws-attr" disabled={!editable} value={s.default_attribution_model} onChange={(e) => setS({ ...s, default_attribution_model: e.target.value as WSettings["default_attribution_model"] })} className={inputCls}>
            <option value="position_based">Position-based (40/20/40)</option><option value="linear">Linear</option><option value="time_decay">Time decay</option><option value="first_touch">First touch</option><option value="last_touch">Last touch</option>
          </select>
        </Field>
        <Field label="Behavioural data retention (months)" htmlFor="ws-ret"><input id="ws-ret" type="number" min={1} max={120} disabled={!editable} value={s.data_retention_months} onChange={(e) => setS({ ...s, data_retention_months: Number(e.target.value) })} className={inputCls} /></Field>
        <div className="flex items-end">{editable ? <Btn type="submit" busy={action.busy}>Save changes</Btn> : <p className="text-[12px] text-mist">Your role can view but not change these settings.</p>}</div>
      </form>
    </Panel>
  );
}

function Members() {
  const { org, workspace, canWs } = useApp();
  const base = `/orgs/${org.id}/workspaces/${workspace!.id}/members`;
  const members = useResource<WorkspaceMember[]>(base);
  const orgMembers = useResource<Member[]>(`/orgs/${org.id}/members`);
  const [add, setAdd] = useState<{ user_id: string; role: WorkspaceRole }>({ user_id: "", role: "strategist" });
  const action = useAction();
  const manage = canWs("workspace.members.manage");
  const assigned = new Set(members.data?.map((m) => m.user_id));
  const candidates = (orgMembers.data ?? []).filter((m) => !assigned.has(m.user_id) && m.role === "member");

  const doAdd = async (e: React.FormEvent) => { e.preventDefault(); if (await action.run(() => api(base, { method: "POST", json: add }))) { setAdd({ ...add, user_id: "" }); members.reload(); } };
  const change = async (uid: string, role: string) => { if (await action.run(() => api(`${base}/${uid}`, { method: "PATCH", json: { role } }))) members.reload(); };
  const remove = async (uid: string) => { await action.run(() => api(`${base}/${uid}`, { method: "DELETE" })); members.reload(); };

  return (
    <div className="space-y-4">
      {action.error && <Notice tone="error">{action.error}</Notice>}
      <Panel title="Assigned members" subtitle="Organisation owners and admins can access every workspace and aren’t listed here.">
        {members.loading && !members.data ? <Spinner /> : members.data?.length === 0 ? <p className="py-4 text-[12.5px] text-mist">No one is assigned specifically to this workspace yet.</p> : (
          <DataTable rows={members.data ?? []} rowKey={(r) => r.user_id} cols={[
            { key: "n", label: "Member", render: (r) => <span><span className="text-white">{r.name}</span><span className="block text-[11px] text-mist">{r.email}</span></span> },
            { key: "r", label: "Workspace role", render: (r) => manage ? (
              <select aria-label={`Role for ${r.name}`} value={r.role} onChange={(e) => change(r.user_id, e.target.value)} className="rounded-md border border-slate-line bg-midnight px-1.5 py-0.5 text-[11.5px] text-white">
                {WORKSPACE_ROLES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            ) : <Badge>{roleLabel(r.role)}</Badge> },
            { key: "a", label: "", render: (r) => manage ? <Btn variant="ghost" className="py-1" onClick={() => remove(r.user_id)}>Remove</Btn> : null },
          ]} />
        )}
      </Panel>
      {manage && (
        <Panel title="Assign an organisation member" subtitle="To add someone new, invite them from Members & invites first.">
          {candidates.length === 0 ? <p className="text-[12.5px] text-mist">Every organisation member is already assigned or has org-wide access.</p> : (
            <form onSubmit={doAdd} className="flex flex-wrap items-end gap-3">
              <Field label="Member" htmlFor="wm-user">
                <select id="wm-user" required value={add.user_id} onChange={(e) => setAdd({ ...add, user_id: e.target.value })} className={`${inputCls} min-w-56`}>
                  <option value="">Select…</option>
                  {candidates.map((m) => <option key={m.user_id} value={m.user_id}>{m.name} · {m.email}</option>)}
                </select>
              </Field>
              <Field label="Role" htmlFor="wm-role">
                <select id="wm-role" value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value as WorkspaceRole })} className={inputCls}>
                  {WORKSPACE_ROLES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                </select>
              </Field>
              <Btn type="submit" busy={action.busy} disabled={!add.user_id}>Assign</Btn>
            </form>
          )}
        </Panel>
      )}
    </div>
  );
}

function Keys() {
  const { org, workspace } = useApp();
  const base = `/orgs/${org.id}/workspaces/${workspace!.id}/api-keys`;
  const keys = useResource<ApiKey[]>(base);
  const [form, setForm] = useState({ name: "", scopes: ["workspace:read"] as string[], expires_in_days: 90 });
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const action = useAction();

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const k = await action.run(() => api<ApiKeyCreated>(base, { method: "POST", json: form }));
    if (k) { setCreated(k); setCopied(false); setForm({ ...form, name: "" }); keys.reload(); }
  };
  const revoke = async (k: ApiKey) => { if (confirm(`Revoke “${k.name}”? Integrations using it will stop working immediately.`)) { await action.run(() => api(`${base}/${k.id}`, { method: "DELETE" })); keys.reload(); } };

  return (
    <div className="space-y-4">
      {action.error && <Notice tone="error">{action.error}</Notice>}
      {created && (
        <div className="rounded-xl border border-teal/50 bg-teal/10 p-4" role="status">
          <p className="text-[13px] font-semibold text-white">Copy your new API key now — it won’t be shown again.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code data-testid="new-api-key" className="break-all rounded-md bg-midnight px-2 py-1.5 font-mono text-[12px] text-teal">{created.key}</code>
            <Btn variant="ghost" onClick={async () => { await navigator.clipboard?.writeText(created.key).catch(() => undefined); setCopied(true); }}><Copy className="h-3.5 w-3.5" aria-hidden />{copied ? "Copied" : "Copy"}</Btn>
            <Btn variant="ghost" onClick={() => setCreated(null)}>Done</Btn>
          </div>
          <p className="mt-2 text-[11px] text-mist">Use as <code className="font-mono">Authorization: Bearer &lt;key&gt;</code> against <code className="font-mono">/v1</code>. Stored only as a SHA-256 hash.</p>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel title="API keys" subtitle="Workspace-scoped, least-privilege, expiring by default">
          {keys.loading && !keys.data ? <Spinner /> : keys.data?.length === 0 ? <p className="py-4 text-[12.5px] text-mist">No API keys yet.</p> : (
            <DataTable rows={keys.data ?? []} rowKey={(r) => r.id} cols={[
              { key: "n", label: "Name", render: (r) => <span><span className="text-white">{r.name}</span><span className="block font-mono text-[10.5px] text-mist">nxk_{r.prefix}_••••</span></span> },
              { key: "s", label: "Scopes", render: (r) => <span className="flex flex-wrap gap-1">{r.scopes.map((s) => <Badge key={s}>{s}</Badge>)}</span> },
              { key: "u", label: "Last used", render: (r) => <span className="text-mist">{r.last_used_at ? new Date(r.last_used_at).toLocaleString() : "Never"}</span> },
              { key: "e", label: "Status", render: (r) => r.revoked_at ? <Badge tone="coral">revoked</Badge> : r.expires_at && new Date(r.expires_at) < new Date() ? <Badge tone="amber">expired</Badge> : <Badge tone="teal">active{r.expires_at ? ` · until ${new Date(r.expires_at).toLocaleDateString()}` : ""}</Badge> },
              { key: "a", label: "", render: (r) => !r.revoked_at ? <Btn variant="danger" className="py-1" onClick={() => revoke(r)}>Revoke</Btn> : null },
            ]} />
          )}
        </Panel>
        <Panel title="Create key">
          <form onSubmit={create} className="space-y-3">
            <Field label="Name" htmlFor="k-name"><input id="k-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Looker Studio connector" /></Field>
            <fieldset>
              <legend className="text-[12px] font-medium text-white">Scopes</legend>
              <div className="mt-1 space-y-1">
                {SCOPES.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-[12.5px] text-mist">
                    <input type="checkbox" checked={form.scopes.includes(s.id)} onChange={() => setForm({ ...form, scopes: form.scopes.includes(s.id) ? form.scopes.filter((x) => x !== s.id) : [...form.scopes, s.id] })} className="accent-[#2e69ee]" />
                    {s.label} <code className="font-mono text-[10.5px]">{s.id}</code>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Expires after" htmlFor="k-exp">
              <select id="k-exp" value={form.expires_in_days} onChange={(e) => setForm({ ...form, expires_in_days: Number(e.target.value) })} className={inputCls}>
                <option value={30}>30 days</option><option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>365 days</option>
              </select>
            </Field>
            <Btn type="submit" busy={action.busy} disabled={!form.name.trim() || form.scopes.length === 0}><KeyRound className="h-3.5 w-3.5" aria-hidden /> Create key</Btn>
          </form>
        </Panel>
      </div>
    </div>
  );
}

function Data() {
  const { org, workspace, canWs, refresh } = useApp();
  const router = useRouter();
  const ws = workspace!;
  const [confirmName, setConfirmName] = useState("");
  const action = useAction();
  const del = async () => {
    const ok = await action.run(async () => { await api(`/orgs/${org.id}/workspaces/${ws.id}`, { method: "DELETE", json: { confirm: confirmName } }); return true; });
    if (ok) {
      await refresh();
      router.replace(`/app/${org.id}`);
    }
  };
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Export workspace data" subtitle="JSON bundle: workspace, settings, members, projects, API-key metadata and audit trail. Never includes secrets.">
        {action.error && <Notice tone="error">{action.error}</Notice>}
        {canWs("workspace.export") ? <Btn variant="ghost" onClick={() => action.run(() => downloadExport(`/orgs/${org.id}/workspaces/${ws.id}/export`))} busy={action.busy}>Download export (.json)</Btn> : <p className="text-[12.5px] text-mist">Your role can’t export this workspace.</p>}
      </Panel>
      <Panel title="Delete workspace" subtitle="Soft delete: the workspace disappears and its API keys are revoked immediately. Recorded in the audit log.">
        {canWs("workspace.delete") ? (
          <div className="space-y-3">
            <Field label={`Type “${ws.name}” to confirm`} htmlFor="del-confirm"><input id="del-confirm" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} className={inputCls} /></Field>
            <Btn variant="danger" disabled={confirmName !== ws.name} busy={action.busy} onClick={del}><Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete workspace</Btn>
          </div>
        ) : <p className="text-[12.5px] text-mist">Only organisation owners and admins can delete workspaces.</p>}
      </Panel>
    </div>
  );
}

export default function WorkspaceSettings() {
  const { workspace, canWs } = useApp();
  const { org } = useApp();
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "general", label: "General", show: true },
    { id: "members", label: "Members", show: true },
    { id: "keys", label: "API keys", show: canWs("api_keys.manage") },
    { id: "audit", label: "Audit log", show: canWs("audit.read") },
    { id: "data", label: "Data & deletion", show: canWs("workspace.export") || canWs("workspace.delete") },
  ];
  const visible = tabs.filter((t) => t.show);
  const [tab, setTab] = useState<Tab>("general");
  return (
    <div className="space-y-4">
      <PageTitle title="Workspace settings" subtitle={`${workspace!.name}${workspace!.is_demo ? " · demo workspace" : ""} · your role: ${roleLabel(workspace!.role) === "—" ? `org ${org.role}` : roleLabel(workspace!.role)}`} />
      <Segmented<Tab> label="Settings section" value={tab} onChange={setTab} options={visible.map((t) => ({ id: t.id, label: t.label }))} />
      {tab === "general" && <General />}
      {tab === "members" && <Members />}
      {tab === "keys" && <Keys />}
      {tab === "audit" && <Panel title="Workspace audit log" subtitle="Append-only"><AuditTable path={`/orgs/${org.id}/workspaces/${workspace!.id}/audit-logs`} /></Panel>}
      {tab === "data" && <Data />}
    </div>
  );
}
