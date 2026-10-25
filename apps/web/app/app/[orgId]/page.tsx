"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { lastWorkspace, useApp } from "@/components/app/AppContext";
import { Notice, Spinner } from "@/components/app/forms";

export default function OrgHome() {
  const { org, workspaces } = useApp();
  const router = useRouter();
  useEffect(() => {
    const last = lastWorkspace(org.id);
    const ws = workspaces.find((w) => w.id === last) ?? workspaces[0];
    if (ws) router.replace(`/app/${org.id}/w/${ws.id}/overview`);
  }, [org.id, workspaces, router]);
  if (!workspaces.length) return <Notice tone="info">You don’t have access to any client workspace in {org.name} yet. An admin can assign you to one.</Notice>;
  return <Spinner label="Opening workspace" />;
}
