"use client";

import { useParams } from "next/navigation";
import { Notice } from "@/components/app/forms";
import OrgAudit from "@/components/app/screens/OrgAudit";
import OrgMembers from "@/components/app/screens/OrgMembers";
import Organization from "@/components/app/screens/Organization";
import Security from "@/components/app/screens/Security";
import Usage from "@/components/app/screens/Usage";

const TABS: Record<string, React.ComponentType> = { members: OrgMembers, usage: Usage, audit: OrgAudit, organization: Organization, security: Security };

export default function OrgTab() {
  const { tab } = useParams<{ tab: string }>();
  const Tab = TABS[tab];
  return Tab ? <Tab /> : <Notice tone="error">Unknown section.</Notice>;
}
