import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { commandScreens } from "@/lib/screens";
import Bridge from "@/components/command/screens/Bridge";
import Recon from "@/components/command/screens/Recon";
import Missions from "@/components/command/screens/Missions";
import Forge from "@/components/command/screens/Forge";
import Cohorts from "@/components/command/screens/Cohorts";
import Journeys from "@/components/command/screens/Journeys";
import Telemetry from "@/components/command/screens/Telemetry";
import Attribution from "@/components/command/screens/Attribution";
import Copilot from "@/components/command/screens/Copilot";
import Dispatch from "@/components/command/screens/Dispatch";
import Systems from "@/components/command/screens/Systems";

const SCREENS: Record<string, React.ComponentType> = {
  bridge: Bridge, recon: Recon, missions: Missions, forge: Forge, cohorts: Cohorts, journeys: Journeys,
  telemetry: Telemetry, attribution: Attribution, copilot: Copilot, dispatch: Dispatch, systems: Systems,
};

export function generateStaticParams() {
  return commandScreens.map((s) => ({ screen: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ screen: string }> }): Promise<Metadata> {
  const { screen } = await params;
  return { title: `${commandScreens.find((s) => s.slug === screen)?.label ?? "Ops"} · Campaign Command` };
}

export default async function Page({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  const Screen = SCREENS[screen];
  if (!Screen) notFound();
  return <Screen />;
}
