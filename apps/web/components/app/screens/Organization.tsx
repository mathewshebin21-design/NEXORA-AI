"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Panel } from "@/components/growth/ui";
import { api, downloadExport } from "@/lib/api/client";
import type { Workspace } from "@/lib/api/types";
import { useApp } from "../AppContext";
import { PageTitle } from "../AppShell";
import { Btn, Field, Notice, inputCls } from "../forms";
import { useAction } from "../useResource";

export default function Organization() {
  const { org, workspaces, can, refresh } = useApp();
  const router = useRouter();
  const [name, setName] = useState(org.name);
  const [wsName, setWsName] = useState("");
  const [confirmSlug, setConfirmSlug] = useState("");
  const [orgName, setOrgName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const action = useAction();

  const rename = async (e: React.FormEvent) => { e.preventDefault(); setMsg(null); if (await action.run(() => api(`/orgs/${org.id}`, { method: "PATCH", json: { name } }))) { setMsg("Organisation renamed."); refresh(); } };
  const createWs = async (e: React.FormEvent) => {
    e.preventDefault();
    const ws = await action.run(() => api<Workspace>(`/orgs/${org.id}/workspaces`, { method: "POST", json: { name: wsName } }));
    if (ws) { await refresh(); router.push(`/app/${org.id}/w/${ws.id}/settings`); }
  };
  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    const o = await action.run(() => api<{ id: string }>(`/orgs`, { method: "POST", json: { name: orgName } }));
    if (o) window.location.assign(`/app/${o.id}`);
  };
  const requestDeletion = async () => { if (await action.run(() => api(`/orgs/${org.id}/deletion-request`, { method: "POST", json: { confirm: confirmSlug } }))) { setConfirmSlug(""); refresh(); } };
  const cancelDeletion = async () => { if (await action.run(() => api(`/orgs/${org.id}/deletion-request`, { method: "DELETE" }))) refresh(); };

  return (
    <div className="space-y-4">
      <PageTitle title="Organization" subtitle={`${org.name} · slug ${org.slug} · plan ${org.plan}`} />
      {action.error && <Notice tone="error">{action.error}</Notice>}
      {msg && <Notice tone="success">{msg}</Notice>}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Details">
          <form onSubmit={rename} className="flex flex-wrap items-end gap-3">
            <Field label="Organisation name" htmlFor="org-name"><input id="org-name" disabled={!can("org.update")} value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} min-w-64`} /></Field>
            {can("org.update") && <Btn type="submit" busy={action.busy} disabled={!name.trim() || name === org.name}>Save</Btn>}
          </form>
        </Panel>
        <Panel title="Client workspaces" subtitle={`${workspaces.length} visible to you`}>
          <ul className="mb-3 flex flex-wrap gap-1.5">{workspaces.map((w) => <li key={w.id}><Badge tone={w.is_demo ? "amber" : "blue"}>{w.name}</Badge></li>)}</ul>
          {can("workspaces.create") ? (
            <form id="new-workspace" onSubmit={createWs} className="flex flex-wrap items-end gap-3">
              <Field label="New client workspace" htmlFor="ws-new"><input id="ws-new" value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="e.g. Verde Botanics" className={`${inputCls} min-w-64`} /></Field>
              <Btn type="submit" busy={action.busy} disabled={!wsName.trim()}><Plus className="h-3.5 w-3.5" aria-hidden /> Create</Btn>
            </form>
          ) : <p className="text-[12.5px] text-mist">Only owners and admins can create workspaces.</p>}
        </Panel>
        <Panel title="Export organisation data" subtitle="Everything in this organisation as JSON — members, invitations, workspaces, projects, key metadata, audit trail.">
          {can("org.export") ? <Btn variant="ghost" onClick={() => action.run(() => downloadExport(`/orgs/${org.id}/export`))}>Download export (.json)</Btn> : <p className="text-[12.5px] text-mist">Only owners can export the whole organisation. Workspace exports are in each workspace’s settings.</p>}
        </Panel>
        <Panel title="New organisation" subtitle="Run a separate agency or brand with fully separate data.">
          <form onSubmit={createOrg} className="flex flex-wrap items-end gap-3">
            <Field label="Organisation name" htmlFor="org-new"><input id="org-new" value={orgName} onChange={(e) => setOrgName(e.target.value)} className={`${inputCls} min-w-64`} /></Field>
            <Btn type="submit" variant="ghost" busy={action.busy} disabled={!orgName.trim()}>Create organisation</Btn>
          </form>
        </Panel>
        <Panel title="Delete organisation" subtitle="Owners only. Data is permanently purged 30 days after the request; you can cancel until then." className="xl:col-span-2">
          {!can("org.delete") ? <p className="text-[12.5px] text-mist">Only owners can request deletion.</p> : org.deletion_requested_at ? (
            <div className="flex flex-wrap items-center gap-3">
              <Notice tone="warn">Deletion requested on {new Date(org.deletion_requested_at).toLocaleDateString()}.</Notice>
              <Btn variant="ghost" onClick={cancelDeletion} busy={action.busy}>Cancel deletion</Btn>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <Field label={`Type the slug “${org.slug}” to confirm`} htmlFor="del-slug"><input id="del-slug" value={confirmSlug} onChange={(e) => setConfirmSlug(e.target.value)} className={`${inputCls} min-w-64`} /></Field>
              <Btn variant="danger" disabled={confirmSlug !== org.slug} busy={action.busy} onClick={requestDeletion}>Request deletion</Btn>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
