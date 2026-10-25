"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3, Bell, Building2, ChevronDown, ChevronsLeft, Command, FileBarChart, GitFork, Globe2, LayoutGrid, Lightbulb, MoreHorizontal,
  Palette, PieChart, Search, Settings, Target, Users, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GROWTH_BASE, growthScreens } from "@/lib/screens";
import { CHANNELS, DEMO_NOTICE, PERIOD_LABEL, liveCampaigns, workspaces } from "@/lib/demo-data";
import { DATA_STATES, PreviewStateProvider, usePreviewState } from "@/lib/preview-state";
import { cn, fmtCompactCurrency, fmtRatio } from "@/lib/format";
import { roas, sumPerformance } from "@/lib/metrics";
import { FilterProvider, Segmented, useFilters, type Range } from "./ui";

const ICONS: Record<string, typeof LayoutGrid> = {
  overview: LayoutGrid, market: Globe2, planner: Target, creative: Palette, segments: Users, journeys: GitFork,
  performance: BarChart3, attribution: PieChart, insights: Lightbulb, reports: FileBarChart, settings: Settings,
};
const GROUPS: { label: string; slugs: string[] }[] = [
  { label: "Analyze", slugs: ["overview", "performance", "attribution", "journeys"] },
  { label: "Plan", slugs: ["market", "planner", "segments"] },
  { label: "Activate", slugs: ["creative", "insights", "reports"] },
  { label: "Admin", slugs: ["settings"] },
];
const MOBILE_TABS = ["overview", "performance", "attribution", "insights"];

function Palette_({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => {
    const nav = growthScreens.map((s) => ({ label: `Go to ${s.label}`, hint: s.requirement, href: `${GROWTH_BASE}/${s.slug}` }));
    const camps = liveCampaigns.map((c) => ({ label: c.name, hint: `${c.id} · ${c.channel}`, href: `${GROWTH_BASE}/performance` }));
    return [...nav, ...camps].filter((i) => (i.label + i.hint).toLowerCase().includes(q.toLowerCase()));
  }, [q]);
  useEffect(() => { if (open) { setQ(""); setIdx(0); setTimeout(() => inputRef.current?.focus(), 10); } }, [open]);
  const go = (href: string) => { router.push(href); onClose(); };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-start justify-center bg-midnight/70 p-4 pt-[12vh] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label="Command palette" initial={{ scale: 0.97, y: -8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-line bg-navy shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-line px-4">
              <Search className="h-4 w-4 text-mist" aria-hidden />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setIdx(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
                  if (e.key === "Enter" && items[idx]) go(items[idx].href);
                  if (e.key === "Escape") onClose();
                }}
                aria-label="Search screens and campaigns"
                placeholder="Jump to a screen, campaign or metric…"
                className="h-12 flex-1 bg-transparent text-sm text-white placeholder:text-mist focus:outline-none"
              />
              <kbd className="rounded border border-slate-line px-1.5 font-mono text-[10px] text-mist">esc</kbd>
            </div>
            <ul className="max-h-80 overflow-y-auto p-2" role="listbox" aria-label="Results">
              {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-mist">No matches</li>}
              {items.map((i, n) => (
                <li key={i.label + n} role="option" aria-selected={n === idx}>
                  <button onMouseEnter={() => setIdx(n)} onClick={() => go(i.href)} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm", n === idx ? "bg-electric/20 text-white" : "text-mist")}>
                    <span>{i.label}</span><span className="text-[11px] text-mist">{i.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Ticker() {
  const t = sumPerformance(liveCampaigns);
  const items = [
    ["Revenue (measured)", fmtCompactCurrency(t.revenue)],
    ["Spend", fmtCompactCurrency(t.spend)],
    ["ROAS", fmtRatio(roas(t.revenue, t.spend))],
    ["Orders", t.conversions.toLocaleString()],
    ["Live campaigns", String(liveCampaigns.filter((c) => c.status === "Live").length)],
    ["Data freshness", "10:42 UTC"],
  ];
  return (
    <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap px-4 py-1.5 text-[11px] no-scrollbar" role="region" aria-label="Key figures" tabIndex={0}>
      {items.map(([k, v]) => (
        <span key={k} className="text-mist">{k} <span className="ml-1 font-mono text-white">{v}</span></span>
      ))}
      <span className="text-amber-signal">● {DEMO_NOTICE}</span>
    </div>
  );
}

function TopFilters() {
  const { range, setRange, channels, toggleChannel, compare, setCompare } = useFilters();
  const { state, setState } = usePreviewState();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented<Range> label="Date range" value={range} onChange={setRange} options={[{ id: 30, label: "30D" }, { id: 60, label: "60D" }, { id: 90, label: "90D" }]} />
      <div className="relative">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 rounded-lg border border-slate-line bg-midnight/60 px-2.5 py-1 text-[11.5px] text-white">
          Channels <span className="rounded bg-electric/30 px-1 font-mono text-[10px]">{channels.length}/{CHANNELS.length}</span> <ChevronDown className="h-3 w-3" aria-hidden />
        </button>
        {open && (
          <div className="absolute right-0 z-40 mt-1 w-52 rounded-lg border border-slate-line bg-navy p-1.5 shadow-xl">
            {CHANNELS.map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white hover:bg-navy-3">
                <input type="checkbox" checked={channels.includes(c)} onChange={() => toggleChannel(c)} className="accent-[#3d7bff]" /> {c}
              </label>
            ))}
          </div>
        )}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11.5px] text-mist">
        <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="accent-[#3d7bff]" /> vs prior period
      </label>
      <label className="sr-only" htmlFor="g-state">Preview data state</label>
      <select id="g-state" value={state} onChange={(e) => setState(e.target.value as typeof state)} className="rounded-lg border border-amber-signal/40 bg-midnight/60 px-2 py-1 text-[11.5px] text-amber-signal">
        {DATA_STATES.map((s) => <option key={s.id} value={s.id}>Preview: {s.label}</option>)}
      </select>
    </div>
  );
}

export function GrowthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const [more, setMore] = useState(false);
  const current = growthScreens.find((s) => pathname.endsWith(`/${s.slug}`));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { setMore(false); }, [pathname]);

  return (
    <PreviewStateProvider>
      <FilterProvider>
        <div className="min-h-screen bg-midnight font-sans text-[#dfe6fb]" style={{ ["--focus-ring" as string]: "#3d7bff" }}>
          <a href="#g-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-electric focus:px-3 focus:py-1.5 focus:text-white">Skip to content</a>
          <div className="flex">
            <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-line/70 bg-navy transition-[width] duration-300 md:flex", collapsed ? "w-[64px]" : "w-[232px]")}>
              <div className="flex h-14 items-center gap-2 border-b border-slate-line/70 px-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-electric to-teal text-[13px] font-bold text-white">N</span>
                {!collapsed && <span className="truncate text-sm font-semibold tracking-tight text-white">Nexora <span className="font-normal text-mist">Growth</span></span>}
              </div>
              {!collapsed && (
                <button className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-slate-line px-2.5 py-2 text-left text-xs hover:bg-navy-2">
                  <Building2 className="h-4 w-4 text-mist" aria-hidden />
                  <span className="flex-1 truncate text-white">{workspaces[0].name}</span>
                  <ChevronDown className="h-3 w-3 text-mist" aria-hidden />
                </button>
              )}
              <nav aria-label="Main" className="mt-2 flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
                {GROUPS.map((g) => (
                  <div key={g.label} className="mt-3">
                    {!collapsed && <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-mist/70">{g.label}</p>}
                    <ul>
                      {g.slugs.map((slug) => {
                        const s = growthScreens.find((x) => x.slug === slug)!;
                        const Icon = ICONS[slug];
                        const active = current?.slug === slug;
                        return (
                          <li key={slug}>
                            <Link href={`${GROWTH_BASE}/${slug}`} aria-current={active ? "page" : undefined} title={collapsed ? s.label : undefined} className={cn("relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition", active ? "bg-electric/15 text-white" : "text-mist hover:bg-navy-2 hover:text-white")}>
                              {active && <motion.span layoutId="g-nav" className="absolute left-0 top-1.5 h-5 w-[3px] rounded-r bg-electric" />}
                              <Icon className={cn("h-4 w-4 shrink-0", active && "text-electric-soft")} aria-hidden />
                              {!collapsed && <span className="truncate">{s.label}</span>}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </nav>
              <button onClick={() => setCollapsed((c) => !c)} className="flex items-center gap-2 border-t border-slate-line/70 px-5 py-3 text-xs text-mist hover:text-white" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
                <ChevronsLeft className={cn("h-4 w-4 transition", collapsed && "rotate-180")} aria-hidden /> {!collapsed && "Collapse"}
              </button>
            </aside>

            <div className="min-w-0 flex-1">
              <header className="sticky top-0 z-30 border-b border-slate-line/70 bg-midnight/85 backdrop-blur-md">
                <div className="flex h-14 items-center justify-between gap-3 px-4">
                  <div className="flex min-w-0 items-center gap-2 text-sm">
                    <Link href="/" className="hidden text-mist hover:text-white sm:inline">Concepts</Link>
                    <span className="hidden text-mist/50 sm:inline">/</span>
                    <span className="hidden text-mist sm:inline">{workspaces[0].name}</span>
                    <span className="hidden text-mist/50 sm:inline">/</span>
                    <h1 className="truncate font-semibold text-white">{current?.label ?? "Overview"}</h1>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setPalette(true)} className="hidden items-center gap-2 rounded-lg border border-slate-line bg-navy px-3 py-1.5 text-xs text-mist hover:text-white sm:flex">
                      <Search className="h-3.5 w-3.5" aria-hidden /> Search <kbd className="ml-4 inline-flex items-center gap-0.5 rounded border border-slate-line px-1 font-mono text-[10px]"><Command className="h-2.5 w-2.5" aria-hidden />K</kbd>
                    </button>
                    <button onClick={() => setPalette(true)} className="grid h-8 w-8 place-items-center rounded-lg text-mist sm:hidden" aria-label="Search"><Search className="h-4 w-4" aria-hidden /></button>
                    <button className="relative grid h-8 w-8 place-items-center rounded-lg text-mist hover:bg-navy-2 hover:text-white" aria-label="Alerts, 3 unread">
                      <Bell className="h-4 w-4" aria-hidden /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-coral-signal" />
                    </button>
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-3 text-[11px] font-semibold text-white" aria-label="Priya Natarajan">PN</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-line/50 px-4 py-2">
                  <span className="font-mono text-[11px] text-mist">{PERIOD_LABEL}</span>
                  <TopFilters />
                </div>
                <div className="border-t border-slate-line/50 bg-navy/60"><Ticker /></div>
              </header>
              <main id="g-main" className="px-4 pb-28 pt-5 md:pb-10">
                <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>{children}</motion.div>
              </main>
            </div>
          </div>

          <nav aria-label="Main (mobile)" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-line bg-navy/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
            {MOBILE_TABS.map((slug) => {
              const Icon = ICONS[slug];
              const active = current?.slug === slug;
              return (
                <Link key={slug} href={`${GROWTH_BASE}/${slug}`} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px]", active ? "text-electric-soft" : "text-mist")}>
                  <Icon className="h-5 w-5" aria-hidden />{growthScreens.find((s) => s.slug === slug)!.label}
                </Link>
              );
            })}
            <button onClick={() => setMore(true)} className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-mist" aria-label="More sections"><MoreHorizontal className="h-5 w-5" aria-hidden />More</button>
          </nav>
          <AnimatePresence>
            {more && (
              <>
                <motion.div className="fixed inset-0 z-50 bg-midnight/70 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMore(false)} />
                <motion.div role="dialog" aria-modal="true" aria-label="All sections" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-slate-line bg-navy p-4 md:hidden">
                  <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-white">All sections</p><button onClick={() => setMore(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-mist"><X className="h-4 w-4" aria-hidden /></button></div>
                  <ul className="grid grid-cols-3 gap-2">
                    {growthScreens.map((s) => { const Icon = ICONS[s.slug]; return (
                      <li key={s.slug}><Link href={`${GROWTH_BASE}/${s.slug}`} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-line p-3 text-center text-[11px] text-white"><Icon className="h-5 w-5 text-electric-soft" aria-hidden />{s.label}</Link></li>
                    ); })}
                  </ul>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          <Palette_ open={palette} onClose={() => setPalette(false)} />
        </div>
      </FilterProvider>
    </PreviewStateProvider>
  );
}
