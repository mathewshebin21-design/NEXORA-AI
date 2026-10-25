"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3, Building2, Check, ChevronDown, ChevronsLeft, FileBarChart, FolderKanban, GitFork, Globe2, KeyRound, LayoutGrid, Lightbulb,
  LogOut, MoreHorizontal, Palette, PieChart, Plus, ScrollText, Settings, ShieldCheck, Target, Users, Gauge, X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/format";
import { rememberWorkspace, useApp } from "./AppContext";

type NavItem = { slug: string; label: string; icon: typeof LayoutGrid; scope: "ws" | "org"; perm?: string };
export const WS_NAV: { label: string; items: NavItem[] }[] = [
  { label: "Analyze", items: [
    { slug: "overview", label: "Overview", icon: LayoutGrid, scope: "ws" },
    { slug: "performance", label: "Performance", icon: BarChart3, scope: "ws" },
    { slug: "attribution", label: "Attribution", icon: PieChart, scope: "ws" },
    { slug: "journeys", label: "Journeys & Funnels", icon: GitFork, scope: "ws" },
  ] },
  { label: "Plan", items: [
    { slug: "market", label: "Market Intel", icon: Globe2, scope: "ws" },
    { slug: "planner", label: "Campaign Planner", icon: Target, scope: "ws" },
    { slug: "segments", label: "Segments", icon: Users, scope: "ws" },
    { slug: "projects", label: "Projects", icon: FolderKanban, scope: "ws", perm: "projects.read" },
  ] },
  { label: "Activate", items: [
    { slug: "creative", label: "Creative Ops", icon: Palette, scope: "ws" },
    { slug: "insights", label: "Insights", icon: Lightbulb, scope: "ws" },
    { slug: "reports", label: "Reports", icon: FileBarChart, scope: "ws" },
    { slug: "settings", label: "Workspace settings", icon: Settings, scope: "ws" },
  ] },
];
export const ORG_NAV: NavItem[] = [
  { slug: "members", label: "Members & invites", icon: Users, scope: "org" },
  { slug: "usage", label: "Plan & usage", icon: Gauge, scope: "org", perm: "usage.read" },
  { slug: "audit", label: "Audit log", icon: ScrollText, scope: "org", perm: "audit.read_org" },
  { slug: "organization", label: "Organization", icon: Building2, scope: "org" },
  { slug: "security", label: "Security", icon: ShieldCheck, scope: "org" },
];

function useClickOutside(onOut: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOut(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onOut]);
  return ref;
}

function Switcher({ label, current, items, footer }: { label: string; current: ReactNode; items: { id: string; label: string; hint?: string; href: string; active: boolean }[]; footer?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="flex max-w-[220px] items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-white hover:bg-navy-2">
        <span className="sr-only">{label}: </span>
        <span className="truncate">{current}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 text-mist" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 z-50 mt-1 w-72 rounded-xl border border-slate-line bg-navy p-1.5 shadow-2xl">
          <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-mist">{label}</p>
          {items.map((i) => (
            <Link key={i.id} role="menuitem" href={i.href} onClick={() => setOpen(false)} className={cn("flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[13px] hover:bg-navy-3", i.active ? "text-white" : "text-mist")}>
              <span className="min-w-0"><span className="block truncate">{i.label}</span>{i.hint && <span className="block text-[10.5px] text-mist">{i.hint}</span>}</span>
              {i.active && <Check className="h-4 w-4 shrink-0 text-electric-soft" aria-hidden />}
            </Link>
          ))}
          {footer && <div className="mt-1 border-t border-slate-line pt-1">{footer}</div>}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { me, org, workspaces, workspace, can } = useApp();
  const { wsId } = useParams<{ wsId?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [more, setMore] = useState(false);
  const activeWs = workspace ?? workspaces[0] ?? null;
  const wsBase = activeWs ? `/app/${org.id}/w/${activeWs.id}` : null;
  const orgBase = `/app/${org.id}/org`;
  const current = pathname.split("/").pop();

  useEffect(() => { if (wsId) rememberWorkspace(org.id, wsId); }, [org.id, wsId]);
  useEffect(() => { setMore(false); }, [pathname]);

  const signOut = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
  };

  const navLink = (i: NavItem) => {
    const href = i.scope === "ws" ? (wsBase ? `${wsBase}/${i.slug}` : null) : `${orgBase}/${i.slug}`;
    if (!href) return null;
    if (i.perm && (i.scope === "org" ? !can(i.perm) : !activeWs?.permissions.includes(i.perm))) return null;
    const active = pathname === href;
    const Icon = i.icon;
    return (
      <li key={i.slug}>
        <Link href={href} aria-current={active ? "page" : undefined} title={collapsed ? i.label : undefined} className={cn("relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition", active ? "bg-electric/15 text-white" : "text-mist hover:bg-navy-2 hover:text-white")}>
          {active && <motion.span layoutId="app-nav" className="absolute left-0 top-1.5 h-5 w-[3px] rounded-r bg-electric" />}
          <Icon className={cn("h-4 w-4 shrink-0", active && "text-electric-soft")} aria-hidden />
          {!collapsed && <span className="truncate">{i.label}</span>}
        </Link>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-midnight font-sans text-[#dfe6fb]" style={{ ["--focus-ring" as string]: "#3d7bff" }}>
      <a href="#app-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-electric focus:px-3 focus:py-1.5 focus:text-white">Skip to content</a>
      <div className="flex">
        <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-line/70 bg-navy transition-[width] duration-300 md:flex", collapsed ? "w-[64px]" : "w-[236px]")}>
          <div className="flex h-14 items-center gap-2 border-b border-slate-line/70 px-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-electric to-teal text-[13px] font-bold text-white">N</span>
            {!collapsed && <span className="truncate text-sm font-semibold tracking-tight text-white">Nexora <span className="font-normal text-mist">Growth</span></span>}
          </div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
            {WS_NAV.map((g) => (
              <div key={g.label} className="mt-3">
                {!collapsed && <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-mist/70">{g.label}</p>}
                <ul>{g.items.map(navLink)}</ul>
              </div>
            ))}
            <div className="mt-3">
              {!collapsed && <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-mist/70">Organization</p>}
              <ul>{ORG_NAV.map(navLink)}</ul>
            </div>
          </nav>
          <button onClick={() => setCollapsed((c) => !c)} className="flex items-center gap-2 border-t border-slate-line/70 px-5 py-3 text-xs text-mist hover:text-white" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <ChevronsLeft className={cn("h-4 w-4 transition", collapsed && "rotate-180")} aria-hidden /> {!collapsed && "Collapse"}
          </button>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-line/70 bg-midnight/85 backdrop-blur-md">
            <div className="flex h-14 items-center justify-between gap-2 px-3 md:px-4">
              <div className="flex min-w-0 items-center gap-0.5">
                <Switcher
                  label="Organizations"
                  current={<span className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-mist" aria-hidden />{org.name}</span>}
                  items={me.memberships.map((m) => ({ id: m.org_id, label: m.org_name, hint: m.role, href: `/app/${m.org_id}`, active: m.org_id === org.id }))}
                />
                <span className="text-mist/50">/</span>
                <Switcher
                  label="Client workspaces"
                  current={activeWs ? activeWs.name : "No workspace"}
                  items={workspaces.map((w) => ({ id: w.id, label: w.name, hint: w.is_demo ? "Synthetic demo data" : w.role ? w.role.replace("_", " ") : "org access", href: `/app/${org.id}/w/${w.id}/${WS_NAV.flatMap((g) => g.items).some((i) => i.slug === current) ? current : "overview"}`, active: w.id === activeWs?.id }))}
                  footer={can("workspaces.create") ? <Link href={`${orgBase}/organization#new-workspace`} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-electric-soft hover:bg-navy-3"><Plus className="h-4 w-4" aria-hidden /> New client workspace</Link> : undefined}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-right text-[11px] leading-tight sm:block"><span className="block text-white">{me.user.name}</span><span className="text-mist">{org.role}</span></span>
                <button onClick={signOut} className="grid h-8 w-8 place-items-center rounded-lg text-mist hover:bg-navy-2 hover:text-white" aria-label="Sign out" title="Sign out"><LogOut className="h-4 w-4" aria-hidden /></button>
              </div>
            </div>
            {activeWs?.is_demo && workspace && (
              <div className="border-t border-amber-signal/30 bg-amber-signal/10 px-4 py-1.5 text-[11.5px] text-amber-signal">Demo workspace · all figures are synthetic sample data for a fictional client. Create a client workspace to start with real (empty) data.</div>
            )}
            {org.deletion_requested_at && (
              <div className="border-t border-coral-signal/30 bg-coral-signal/10 px-4 py-1.5 text-[11.5px] text-coral-signal">This organisation is scheduled for deletion. An owner can cancel in Organization settings.</div>
            )}
          </header>
          <main id="app-main" className="px-4 pb-28 pt-5 md:pb-10">{children}</main>
        </div>
      </div>

      <nav aria-label="Main (mobile)" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-line bg-navy/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {[["overview", LayoutGrid, "Overview"], ["performance", BarChart3, "Performance"], ["projects", FolderKanban, "Projects"], ["settings", KeyRound, "Settings"]].map(([slug, Icon, label]) => {
          const I = Icon as typeof LayoutGrid;
          const href = wsBase ? `${wsBase}/${slug}` : orgBase + "/members";
          return <Link key={slug as string} href={href} aria-current={pathname === href ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px]", pathname === href ? "text-electric-soft" : "text-mist")}><I className="h-5 w-5" aria-hidden />{label as string}</Link>;
        })}
        <button onClick={() => setMore(true)} className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-mist" aria-label="More sections"><MoreHorizontal className="h-5 w-5" aria-hidden />More</button>
      </nav>
      <AnimatePresence>
        {more && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-midnight/70 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMore(false)} />
            <motion.div role="dialog" aria-modal="true" aria-label="All sections" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-slate-line bg-navy p-4 md:hidden">
              <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-white">All sections</p><button onClick={() => setMore(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-mist"><X className="h-4 w-4" aria-hidden /></button></div>
              <ul className="grid grid-cols-3 gap-2">
                {[...WS_NAV.flatMap((g) => g.items), ...ORG_NAV].map((i) => {
                  const href = i.scope === "ws" ? (wsBase ? `${wsBase}/${i.slug}` : null) : `${orgBase}/${i.slug}`;
                  if (!href) return null;
                  const Icon = i.icon;
                  return <li key={i.slug}><Link href={href} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-line p-3 text-center text-[11px] text-white"><Icon className="h-5 w-5 text-electric-soft" aria-hidden />{i.label}</Link></li>;
                })}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-mist">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
