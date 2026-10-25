/** Navigation registry for the three concepts. Each concept owns its own IA and URL vocabulary. */

export type ScreenDef = { slug: string; label: string; requirement: string };

export const ATELIER_BASE = "/atelier/studio";
export const atelierScreens: ScreenDef[] = [
  { slug: "today", label: "Today", requirement: "Main dashboard" },
  { slug: "research", label: "Research", requirement: "Marketing intelligence" },
  { slug: "campaigns", label: "Campaigns", requirement: "Campaign planning" },
  { slug: "creative", label: "Creative", requirement: "Creative asset studio" },
  { slug: "audiences", label: "Audiences", requirement: "Audience segmentation" },
  { slug: "journeys", label: "Journeys", requirement: "Customer journeys" },
  { slug: "performance", label: "Performance", requirement: "Performance analytics" },
  { slug: "attribution", label: "Attribution", requirement: "Revenue attribution" },
  { slug: "counsel", label: "Counsel", requirement: "AI recommendations" },
  { slug: "editions", label: "Editions", requirement: "Reporting" },
  { slug: "house", label: "House", requirement: "Settings & integrations" },
];

export const GROWTH_BASE = "/growth/app";
export const growthScreens: ScreenDef[] = [
  { slug: "overview", label: "Overview", requirement: "Main dashboard" },
  { slug: "market", label: "Market Intel", requirement: "Marketing intelligence" },
  { slug: "planner", label: "Campaign Planner", requirement: "Campaign planning" },
  { slug: "creative", label: "Creative Ops", requirement: "Creative asset studio" },
  { slug: "segments", label: "Segments", requirement: "Audience segmentation" },
  { slug: "journeys", label: "Journeys & Funnels", requirement: "Customer journeys" },
  { slug: "performance", label: "Performance", requirement: "Performance analytics" },
  { slug: "attribution", label: "Attribution", requirement: "Revenue attribution" },
  { slug: "insights", label: "Insights", requirement: "AI recommendations" },
  { slug: "reports", label: "Reports", requirement: "Reporting" },
  { slug: "settings", label: "Settings", requirement: "Settings & integrations" },
];

export const COMMAND_BASE = "/command/ops";
export const commandScreens: ScreenDef[] = [
  { slug: "bridge", label: "Bridge", requirement: "Main dashboard" },
  { slug: "recon", label: "Recon", requirement: "Marketing intelligence" },
  { slug: "missions", label: "Missions", requirement: "Campaign planning" },
  { slug: "forge", label: "Forge", requirement: "Creative asset studio" },
  { slug: "cohorts", label: "Cohorts", requirement: "Audience segmentation" },
  { slug: "journeys", label: "Journey Map", requirement: "Customer journeys" },
  { slug: "telemetry", label: "Telemetry", requirement: "Performance analytics" },
  { slug: "attribution", label: "Attribution Flow", requirement: "Revenue attribution" },
  { slug: "copilot", label: "Copilot", requirement: "AI recommendations" },
  { slug: "dispatch", label: "Dispatch", requirement: "Reporting" },
  { slug: "systems", label: "Systems", requirement: "Settings & integrations" },
];

export const CONCEPTS = [
  { id: "atelier", letter: "A", name: "Nexora Atelier", landing: "/atelier", app: ATELIER_BASE, screens: atelierScreens },
  { id: "growth", letter: "B", name: "Nexora Growth Intelligence", landing: "/growth", app: GROWTH_BASE, screens: growthScreens },
  { id: "command", letter: "C", name: "Nexora Campaign Command", landing: "/command", app: COMMAND_BASE, screens: commandScreens },
] as const;
