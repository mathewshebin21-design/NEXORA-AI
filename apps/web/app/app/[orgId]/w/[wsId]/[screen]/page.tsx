"use client";

import { useParams } from "next/navigation";
import { useApp } from "@/components/app/AppContext";
import { Notice } from "@/components/app/forms";
import { AnalyticsScreen, ANALYTICS_SLUGS } from "@/components/app/screens/Analytics";
import Projects from "@/components/app/screens/Projects";
import WorkspaceSettings from "@/components/app/screens/WorkspaceSettings";

export default function WorkspaceScreen() {
  const { screen } = useParams<{ screen: string }>();
  const { workspace } = useApp();
  if (!workspace) return <Notice tone="error">This workspace doesn’t exist or you don’t have access to it.</Notice>;
  if (screen === "projects") return <Projects />;
  if (screen === "settings") return <WorkspaceSettings />;
  if (ANALYTICS_SLUGS.includes(screen)) return <AnalyticsScreen slug={screen} />;
  return <Notice tone="error">Unknown section.</Notice>;
}
