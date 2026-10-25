import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { atelierScreens } from "@/lib/screens";
import Today from "@/components/atelier/screens/Today";
import Research from "@/components/atelier/screens/Research";
import Campaigns from "@/components/atelier/screens/Campaigns";
import Creative from "@/components/atelier/screens/Creative";
import Audiences from "@/components/atelier/screens/Audiences";
import Journeys from "@/components/atelier/screens/Journeys";
import Performance from "@/components/atelier/screens/Performance";
import Attribution from "@/components/atelier/screens/Attribution";
import Counsel from "@/components/atelier/screens/Counsel";
import Editions from "@/components/atelier/screens/Editions";
import House from "@/components/atelier/screens/House";

const SCREENS: Record<string, React.ComponentType> = {
  today: Today, research: Research, campaigns: Campaigns, creative: Creative, audiences: Audiences, journeys: Journeys,
  performance: Performance, attribution: Attribution, counsel: Counsel, editions: Editions, house: House,
};

export function generateStaticParams() {
  return atelierScreens.map((s) => ({ screen: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ screen: string }> }): Promise<Metadata> {
  const { screen } = await params;
  return { title: `${atelierScreens.find((s) => s.slug === screen)?.label ?? "Studio"} · Atelier` };
}

export default async function Page({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  const Screen = SCREENS[screen];
  if (!Screen) notFound();
  return <Screen />;
}
