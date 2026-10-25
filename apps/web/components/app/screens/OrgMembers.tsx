"use client";

import { useState } from "react";
import { Copy, Send } from "lucide-react";
import { Badge, DataTable, Panel } from "@/components/growth/ui";
import { api } from "@/lib/api/client";
import { WORKSPACE_ROLES, roleLabel, type Invitation, type InvitationCreated, type Member, type OrgRole, type WorkspaceRole } from "@/lib/api/types";
import { useApp } from "../AppContext";
import { PageTitle } from "../AppShell";
import { Btn, Field, Notice, Spinner, inputCls } from "../forms";
import { useAction, useResource } from "../useResource";

export default function OrgMembers() {
  const { org, me, workspaces, can, refresh } = useApp();
  const members = useResource<Member[]>(`/orgs/${org.id}/members`);
  const invites = useResource<Invitation[]>(can("invitations.manage") ? `/orgs/${org.id}/invitations` : null);
  const action = useAction();
  const [form, setForm] = useState<{ email: string; org_role: "admin" | "member"; workspace_id: string; workspace_role: WorkspaceRole }>({ email: "", org_role: "member", workspace_id: "", workspace_role: "strategist" });
  const [created, setCreated] = useState<InvitationCreated | null>(null);
  const manage = can("members.manage");
  const isOwner = org.role === "owner";

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { email: form.email, org_role: form.org_role, ...(form.org_role === "member" && form.workspace_id ? { workspace_id: form.workspace_id, workspace_role: form.workspace_role } : {}) };
    const inv = await action.run(() => api<InvitationCreated>(`/orgs/${org.id}/invitations`, { method: "POST", json: body }));
    if (inv) { setCreated(inv); setForm({ ...form, email: "" }); invites.reload(); }
  };
  const setRole = async (m: Member, role: OrgRole) => { if (await action.run(() => api<Member[]>(`/orgs/${org.id}/members/${m.user_id}`, { method: "PATCH", json: { role } }))) { members.reload(); refresh(); } };
  const remove = async (m: Member) => {
    const self = m.user_id === me.user.id;
    if (!confirm(self ? `Leave ${org.name}?` : `Remove ${m.name} from ${org.name}? They lose access to every workspace.`)) return;
    const ok = await action.run(async () => { await api(`/orgs/${org.id}/members/${m.user_id}`, { method: "DELETE" }); return true; });
    if (ok) { if (self) window.location.assign("/app"); else members.reload(); }
  };
  const revoke = async (i: Invitation) => { await action.run(() => api(`/orgs/${org.id}/invitations/${i.id}`, { method: "DELETE" })); invites.reload(); };

  return (
    <div className="space-y-4">
      <PageTitle title="Members & invitations" subtitle={`${org.name} · you are ${org.role}`} />
      {action.error && <Notice tone="error">{action.error}</Notice>}
      <Panel title="Members" subtitle="Owners and admins can access every client workspace. Members only see workspaces they’re assigned to.">
        {members.loading && !members.data ? <Spinner /> : (
          <DataTable rows={members.data ?? []} rowKey={(r) => r.user_id} cols={[
            { key: "n", label: "Member", render: (r) => <span><span className="text-white">{r.name}{r.user_id === me.user.id && <span className="text-mist"> (you)</span>}</span><span className="block text-[11px] text-mist">{r.email}</span></span>, sort: (r) => r.name },
            { key: "r", label: "Org role", render: (r) => manage && (isOwner || r.role !== "owner") ? (
              <select aria-label={`Organisation role for ${r.name}`} value={r.role} onChange={(e) => setRole(r, e.target.value as OrgRole)} className="rounded-md border border-slate-line bg-midnight px-1.5 py-0.5 text-[11.5px] text-white">
                {isOwner && <option value="owner">Owner</option>}{!isOwner && r.role === "owner" && <option value="owner">Owner</option>}<option value="admin">Admin</option><option value="member">Member</option>
              </select>
            ) : <Badge tone={r.role === "owner" ? "blue" : "slate"}>{r.role}</Badge> },
            { key: "w", label: "Workspaces", render: (r) => r.role !== "member" ? <span className="text-mist">All (org {r.role})</span> : r.workspaces.length ? <span className="flex flex-wrap gap-1">{r.workspaces.map((w) => <Badge key={w.workspace_id}>{w.workspace_name} · {roleLabel(w.role)}</Badge>)}</span> : <span className="text-amber-signal">None assigned</span> },
            { key: "a", label: "", render: (r) => (manage && (isOwner || r.role !== "owner")) || r.user_id === me.user.id ? <Btn variant="ghost" className="py-1" onClick={() => remove(r)}>{r.user_id === me.user.id ? "Leave" : "Remove"}</Btn> : null },
          ]} />
        )}
      </Panel>

      {can("invitations.manage") && (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <Panel title="Invitations" subtitle="Links expire after 7 days. Email delivery isn’t configured yet — share links over a trusted channel.">
            {created && (
              <div className="mb-3 rounded-lg border border-teal/50 bg-teal/10 p-3" role="status">
                <p className="text-[12.5px] text-white">Invitation created for {created.email}. Copy the link now — it won’t be shown again.</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code data-testid="invite-link" className="break-all rounded bg-midnight px-2 py-1 font-mono text-[11.5px] text-teal">{created.accept_url}</code>
                  <Btn variant="ghost" onClick={() => navigator.clipboard?.writeText(created.accept_url).catch(() => undefined)}><Copy className="h-3.5 w-3.5" aria-hidden /> Copy</Btn>
                </div>
              </div>
            )}
            {invites.loading && !invites.data ? <Spinner /> : invites.data?.length === 0 ? <p className="py-4 text-[12.5px] text-mist">No invitations sent yet.</p> : (
              <DataTable rows={invites.data ?? []} rowKey={(r) => r.id} dense cols={[
                { key: "e", label: "Email", render: (r) => <span className="text-white">{r.email}</span> },
                { key: "r", label: "Access", render: (r) => <span className="text-mist">{r.org_role}{r.workspace_role ? ` · ${roleLabel(r.workspace_role)} in ${workspaces.find((w) => w.id === r.workspace_id)?.name ?? "workspace"}` : ""}</span> },
                { key: "s", label: "Status", render: (r) => <Badge tone={r.status === "pending" ? "amber" : r.status === "accepted" ? "teal" : "slate"}>{r.status}</Badge> },
                { key: "x", label: "Expires", render: (r) => <span className="text-mist">{new Date(r.expires_at).toLocaleDateString()}</span> },
                { key: "a", label: "", render: (r) => r.status === "pending" ? <Btn variant="ghost" className="py-1" onClick={() => revoke(r)}>Revoke</Btn> : null },
              ]} />
            )}
          </Panel>
          <Panel title="Invite someone">
            <form onSubmit={invite} className="space-y-3">
              <Field label="Email" htmlFor="inv-email"><input id="inv-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="colleague@agency.com" /></Field>
              <Field label="Organisation role" htmlFor="inv-role">
                <select id="inv-role" value={form.org_role} onChange={(e) => setForm({ ...form, org_role: e.target.value as "admin" | "member" })} className={inputCls}>
                  <option value="member">Member — only assigned workspaces</option><option value="admin">Admin — all workspaces and settings</option>
                </select>
              </Field>
              {form.org_role === "member" && (
                <>
                  <Field label="Client workspace" htmlFor="inv-ws">
                    <select id="inv-ws" value={form.workspace_id} onChange={(e) => setForm({ ...form, workspace_id: e.target.value })} className={inputCls}>
                      <option value="">None yet</option>{workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </Field>
                  {form.workspace_id && (
                    <Field label="Workspace role" htmlFor="inv-wrole">
                      <select id="inv-wrole" value={form.workspace_role} onChange={(e) => setForm({ ...form, workspace_role: e.target.value as WorkspaceRole })} className={inputCls}>
                        {WORKSPACE_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    </Field>
                  )}
                </>
              )}
              <Btn type="submit" busy={action.busy} disabled={!form.email}><Send className="h-3.5 w-3.5" aria-hidden /> Create invitation</Btn>
            </form>
          </Panel>
        </div>
      )}
    </div>
  );
}
