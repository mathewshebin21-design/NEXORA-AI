"use client";

import { Badge, DataTable, Panel } from "@/components/growth/ui";
import { api } from "@/lib/api/client";
import type { SessionInfo } from "@/lib/api/types";
import { useApp } from "../AppContext";
import { PageTitle } from "../AppShell";
import { Btn, Notice, Spinner } from "../forms";
import { useAction, useResource } from "../useResource";

const device = (ua: string | null) => {
  if (!ua) return "Unknown device";
  const b = /Firefox|Edg|Chrome|Safari/.exec(ua)?.[0] ?? "Browser";
  const os = /Windows|Mac OS X|Linux|Android|iPhone|iPad/.exec(ua)?.[0] ?? "";
  return `${b === "Edg" ? "Edge" : b}${os ? ` on ${os.replace("Mac OS X", "macOS")}` : ""}`;
};

export default function Security() {
  const { me } = useApp();
  const sessions = useResource<SessionInfo[]>("/auth/sessions");
  const action = useAction();
  const revoke = async (s: SessionInfo) => { await action.run(() => api(`/auth/sessions/${s.id}`, { method: "DELETE" })); sessions.reload(); };
  return (
    <div className="space-y-4">
      <PageTitle title="Security" subtitle={`Signed in as ${me.user.email}`} />
      {action.error && <Notice tone="error">{action.error}</Notice>}
      <Panel title="Active sessions" subtitle="Sessions are HttpOnly cookies backed by server-side records; revoking one signs that device out immediately.">
        {sessions.loading && !sessions.data ? <Spinner /> : (
          <DataTable rows={sessions.data ?? []} rowKey={(r) => r.id} cols={[
            { key: "d", label: "Device", render: (r) => <span className="text-white">{device(r.user_agent)} {r.current && <Badge tone="teal">this device</Badge>}</span> },
            { key: "ip", label: "IP", render: (r) => <span className="font-mono text-mist">{r.ip ?? "—"}</span> },
            { key: "l", label: "Last active", render: (r) => <span className="text-mist">{new Date(r.last_seen_at).toLocaleString()}</span> },
            { key: "e", label: "Expires", render: (r) => <span className="text-mist">{new Date(r.expires_at).toLocaleDateString()}</span> },
            { key: "a", label: "", render: (r) => !r.current ? <Btn variant="ghost" className="py-1" onClick={() => revoke(r)}>Sign out</Btn> : null },
          ]} />
        )}
      </Panel>
      <Panel title="Account protection">
        <ul className="space-y-1.5 text-[12.5px] text-mist">
          <li>• Passwords are hashed with Argon2id; sessions and API keys are stored only as SHA-256 hashes.</li>
          <li>• Five failed sign-ins lock the account for 15 minutes; sign-in attempts are rate-limited per IP.</li>
          <li>• Every state-changing request needs a CSRF header and a trusted origin.</li>
          <li>• Planned: multi-factor authentication, SSO (SAML/OIDC) and email verification.</li>
        </ul>
      </Panel>
    </div>
  );
}
