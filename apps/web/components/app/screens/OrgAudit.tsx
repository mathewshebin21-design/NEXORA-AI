"use client";

import { Panel } from "@/components/growth/ui";
import { useApp } from "../AppContext";
import { PageTitle } from "../AppShell";
import { AuditTable } from "../AuditTable";
import { Notice } from "../forms";

export default function OrgAudit() {
  const { org, can } = useApp();
  if (!can("audit.read_org")) return <Notice tone="warn">Only organisation owners and admins can view the organisation-wide audit log.</Notice>;
  return (
    <div className="space-y-4">
      <PageTitle title="Audit log" subtitle="Append-only record of sign-ins, membership, configuration, API-key and data events across every workspace." />
      <Panel title="All events"><AuditTable path={`/orgs/${org.id}/audit-logs`} /></Panel>
    </div>
  );
}
