"use client";

import Link from "next/link";
import { Cable, Database } from "lucide-react";
import { BaseCtx, FilterProvider, Panel, Segmented, useFilters, type Range } from "@/components/growth/ui";
import Overview from "@/components/growth/screens/Overview";
import Market from "@/components/growth/screens/Market";
import Planner from "@/components/growth/screens/Planner";
import Creative from "@/components/growth/screens/Creative";
import Segments from "@/components/growth/screens/Segments";
import Journeys from "@/components/growth/screens/Journeys";
import Performance from "@/components/growth/screens/Performance";
import Attribution from "@/components/growth/screens/Attribution";
import Insights from "@/components/growth/screens/Insights";
import Reports from "@/components/growth/screens/Reports";
import { CHANNELS } from "@/lib/demo-data";
import { useApp } from "../AppContext";
import { PageTitle, WS_NAV } from "../AppShell";

const SCREENS: Record<string, React.ComponentType> = {
  overview: Overview, market: Market, planner: Planner, creative: Creative, segments: Segments, journeys: Journeys,
  performance: Performance, attribution: Attribution, insights: Insights, reports: Reports,
};
export const ANALYTICS_SLUGS = Object.keys(SCREENS);

const PHASE: Record<string, string> = {
  overview: "Phase 8 — analytics engine", performance: "Phase 8 — analytics engine", attribution: "Phase 8 — attribution",
  journeys: "Phase 6 — journeys", market: "Phase 3 — marketing intelligence", planner: "Phase 4 — campaign strategy",
  segments: "Phase 6 — segmentation", creative: "Phase 5 — creative studio", insights: "Phase 10 — copilot", reports: "Phase 11 — reports",
};

function DemoFilters() {
  const { range, setRange, channels, toggleChannel } = useFilters();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Segmented<Range> label="Date range" value={range} onChange={setRange} options={[{ id: 30, label: "30D" }, { id: 60, label: "60D" }, { id: 90, label: "90D" }]} />
      <div className="flex flex-wrap gap-1" role="group" aria-label="Channels">
        {CHANNELS.map((c) => (
          <button key={c} aria-pressed={channels.includes(c)} onClick={() => toggleChannel(c)} className={channels.includes(c) ? "rounded-md bg-electric/20 px-2 py-1 text-[11px] text-white ring-1 ring-electric/50" : "rounded-md px-2 py-1 text-[11px] text-mist ring-1 ring-slate-line"}>{c}</button>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsScreen({ slug }: { slug: string }) {
  const { org, workspace } = useApp();
  const label = WS_NAV.flatMap((g) => g.items).find((i) => i.slug === slug)?.label ?? slug;
  if (!workspace) return null;

  if (!workspace.is_demo) {
    return (
      <div>
        <PageTitle title={label} subtitle={workspace.name} />
        <Panel title="No data connected yet" subtitle={`Arrives in ${PHASE[slug]}`}>
          <div className="flex flex-col items-start gap-3 py-4 text-[13px] text-mist md:flex-row md:items-center md:gap-6">
            <Database className="h-8 w-8 shrink-0 text-electric-soft" aria-hidden />
            <p className="max-w-2xl">
              This workspace has no connected sources, so there is nothing to measure yet — and Nexora never fills the gap with estimates.
              Authorised connectors (Google Ads, Meta Ads, GA4, Shopify) are the next phase. Until then, the demo workspace shows how this screen behaves with synthetic data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {workspace.permissions.includes("projects.read") && <Link href={`/app/${org.id}/w/${workspace.id}/projects`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-3 py-1.5 text-[12px] text-white hover:bg-navy-3">Plan work in Projects</Link>}
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-line px-3 py-1.5 text-[12px] text-mist"><Cable className="h-3.5 w-3.5" aria-hidden /> Connectors — not yet available</span>
          </div>
        </Panel>
      </div>
    );
  }

  const Screen = SCREENS[slug];
  return (
    <BaseCtx.Provider value={`/app/${org.id}/w/${workspace.id}`}>
      <FilterProvider>
        <PageTitle title={label} subtitle={`${workspace.name} · synthetic demo data`} />
        {["overview", "performance", "attribution"].includes(slug) && <DemoFilters />}
        <Screen />
      </FilterProvider>
    </BaseCtx.Provider>
  );
}
