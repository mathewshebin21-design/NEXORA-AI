import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { growthScreens } from "@/lib/screens";
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
import Settings from "@/components/growth/screens/Settings";

const SCREENS: Record<string, React.ComponentType> = {
  overview: Overview, market: Market, planner: Planner, creative: Creative, segments: Segments, journeys: Journeys,
  performance: Performance, attribution: Attribution, insights: Insights, reports: Reports, settings: Settings,
};

export function generateStaticParams() {
  return growthScreens.map((s) => ({ screen: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ screen: string }> }): Promise<Metadata> {
  const { screen } = await params;
  return { title: `${growthScreens.find((s) => s.slug === screen)?.label ?? "App"} · Growth Intelligence` };
}

export default async function Page({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  const Screen = SCREENS[screen];
  if (!Screen) notFound();
  return <Screen />;
}
