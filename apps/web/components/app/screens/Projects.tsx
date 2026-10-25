"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Badge, DataTable, Panel } from "@/components/growth/ui";
import { api } from "@/lib/api/client";
import type { Project } from "@/lib/api/types";
import { useApp } from "../AppContext";
import { PageTitle } from "../AppShell";
import { Btn, Field, Notice, Spinner, inputCls } from "../forms";
import { useAction, useResource } from "../useResource";

const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function Projects() {
  const { org, workspace, canWs } = useApp();
  const [showArchived, setShowArchived] = useState(false);
  const base = `/orgs/${org.id}/workspaces/${workspace!.id}/projects`;
  const { data, error, loading, reload } = useResource<Project[]>(`${base}${showArchived ? "?include_archived=true" : ""}`);
  const [form, setForm] = useState({ name: "", description: "" });
  const action = useAction();
  const canWrite = canWs("projects.write");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await action.run(() => api<Project>(base, { method: "POST", json: form }));
    if (ok) { setForm({ name: "", description: "" }); reload(); }
  };
  const setStatus = async (p: Project, status: Project["status"]) => { if (await action.run(() => api(`${base}/${p.id}`, { method: "PATCH", json: { status } })) !== undefined) reload(); };
  const remove = async (p: Project) => {
    if (!confirm(`Delete project “${p.name}”? This is recorded in the audit log.`)) return;
    await action.run(() => api(`${base}/${p.id}`, { method: "DELETE" }));
    reload();
  };

  return (
    <div className="space-y-4">
      <PageTitle title="Projects" subtitle={`Organise work for ${workspace!.name}. Every change is audited.`} />
      {action.error && <Notice tone="error">{action.error}</Notice>}
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel title="All projects" subtitle={data ? `${data.length} shown` : undefined} actions={
          <label className="flex items-center gap-1.5 text-[11.5px] text-mist"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-[#2e69ee]" /> Show archived</label>
        }>
          {loading && !data ? <Spinner /> : error ? <Notice tone="error">{error}</Notice> : data && data.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-mist">No projects yet.{canWrite ? " Create the first one on the right." : ""}</p>
          ) : (
            <DataTable
              rows={data ?? []}
              rowKey={(r) => r.id}
              cols={[
                { key: "n", label: "Project", render: (r) => <span><span className="font-medium text-white">{r.name}</span>{r.description && <span className="block max-w-md truncate text-[11px] text-mist">{r.description}</span>}</span>, sort: (r) => r.name },
                { key: "s", label: "Status", render: (r) => canWrite ? (
                  <select aria-label={`Status of ${r.name}`} value={r.status} onChange={(e) => setStatus(r, e.target.value as Project["status"])} className="rounded-md border border-slate-line bg-midnight px-1.5 py-0.5 text-[11.5px] text-white">
                    <option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option>
                  </select>
                ) : <Badge tone={r.status === "active" ? "teal" : "slate"}>{r.status}</Badge> },
                { key: "u", label: "Updated", align: "right", render: (r) => fmtDate(r.updated_at), sort: (r) => r.updated_at },
                { key: "a", label: "", render: (r) => canWrite ? <button onClick={() => remove(r)} aria-label={`Delete ${r.name}`} className="grid h-7 w-7 place-items-center rounded text-mist hover:text-coral-signal"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button> : null },
              ]}
            />
          )}
        </Panel>
        {canWrite ? (
          <Panel title="New project">
            <form onSubmit={create} className="space-y-3">
              <Field label="Name" htmlFor="p-name"><input id="p-name" required maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Holiday gifting 2026" /></Field>
              <Field label="Description" htmlFor="p-desc"><textarea id="p-desc" rows={3} maxLength={4000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} /></Field>
              <Btn type="submit" busy={action.busy} disabled={!form.name.trim()}>Create project</Btn>
            </form>
          </Panel>
        ) : (
          <Panel title="Read-only"><p className="text-[12.5px] text-mist">Your role in this workspace can view projects but not change them.</p></Panel>
        )}
      </div>
    </div>
  );
}
