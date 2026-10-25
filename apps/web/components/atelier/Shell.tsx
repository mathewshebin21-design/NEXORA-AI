"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ATELIER_BASE, atelierScreens } from "@/lib/screens";
import { DEMO_NOTICE, workspaces } from "@/lib/demo-data";
import { DATA_STATES, PreviewStateProvider, usePreviewState } from "@/lib/preview-state";
import { cn } from "@/lib/format";

function StateSwitch() {
  const { state, setState } = usePreviewState();
  return (
    <div role="radiogroup" aria-label="Preview data state" className="flex items-center gap-1 rounded-full bg-graphite/5 p-0.5">
      {DATA_STATES.map((s) => (
        <button
          key={s.id}
          role="radio"
          aria-checked={state === s.id}
          onClick={() => setState(s.id)}
          className={cn("rounded-full px-2.5 py-0.5 text-[11px] transition", state === s.id ? "bg-graphite text-ivory" : "text-graphite-soft hover:text-graphite")}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [ws, setWs] = useState(workspaces[0]);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox" className="flex items-center gap-2 rounded-full border border-parchment px-3 py-1.5 text-sm hover:border-champagne">
        <span className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-graphite" style={{ background: ws.color }}>{ws.initials}</span>
        <span className="hidden sm:inline">{ws.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-stone" aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-parchment bg-ivory p-2 shadow-xl"
          >
            <li className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.18em] text-stone">Client workspaces · isolated</li>
            {workspaces.map((w) => (
              <li key={w.id}>
                <button
                  role="option"
                  aria-selected={w.id === ws.id}
                  onClick={() => { setWs(w); setOpen(false); }}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-ivory-deep", w.id === ws.id && "bg-ivory-deep")}
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold text-graphite" style={{ background: w.color }}>{w.initials}</span>
                  <span>
                    <span className="block text-graphite">{w.name}</span>
                    <span className="block text-xs text-stone">{w.industry}</span>
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AtelierShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); }, [pathname]);

  return (
    <PreviewStateProvider>
      <div className="min-h-screen bg-ivory font-manrope text-graphite" style={{ ["--focus-ring" as string]: "#9c7e45" }}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-graphite focus:px-4 focus:py-2 focus:text-ivory">Skip to content</a>
        <div className="border-b border-parchment/70 bg-ivory-deep/60">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-5 py-1.5 text-[11px] text-graphite-soft md:px-10">
            <span className="truncate"><Link href="/" className="underline-offset-2 hover:underline">← All concepts</Link> · {DEMO_NOTICE}</span>
            <div className="hidden items-center gap-2 sm:flex"><span className="text-stone">Preview state</span><StateSwitch /></div>
          </div>
        </div>
        <header className="sticky top-0 z-40 border-b border-parchment/70 bg-ivory/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 md:px-10">
            <Link href="/atelier" className="flex items-baseline gap-2">
              <span className="font-serif text-2xl tracking-tight">Nexora</span>
              <span className="font-serif text-sm italic text-champagne-deep">Atelier</span>
            </Link>
            <div className="flex items-center gap-2">
              <button className="hidden items-center gap-2 rounded-full border border-parchment px-3 py-1.5 text-sm text-stone hover:border-champagne md:flex" aria-label="Search the studio">
                <Search className="h-4 w-4" aria-hidden /> Search the studio
              </button>
              <WorkspaceSwitcher />
              <span className="hidden h-9 w-9 place-items-center rounded-full bg-graphite font-serif text-sm text-ivory md:grid" aria-label="Signed in as Priya Natarajan">PN</span>
              <button className="grid h-10 w-10 place-items-center rounded-full border border-parchment lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu">
                <Menu className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
          <nav aria-label="Studio sections" className="mx-auto hidden max-w-[1400px] px-10 lg:block">
            <ul className="flex gap-7 overflow-x-auto no-scrollbar">
              {atelierScreens.map((s) => {
                const href = `${ATELIER_BASE}/${s.slug}`;
                const active = pathname === href;
                return (
                  <li key={s.slug} className="relative">
                    <Link href={href} aria-current={active ? "page" : undefined} className={cn("block whitespace-nowrap pb-3 pt-1 text-[13px] tracking-wide transition", active ? "text-graphite" : "text-stone hover:text-graphite")}>
                      {s.label}
                    </Link>
                    {active && <motion.span layoutId="atelier-nav" className="absolute inset-x-0 -bottom-px h-[2px] bg-champagne" />}
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>

        <AnimatePresence>
          {menu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col bg-graphite text-ivory"
              role="dialog"
              aria-modal="true"
              aria-label="Studio menu"
            >
              <div className="flex items-center justify-between px-5 py-4">
                <span className="font-serif text-2xl">Nexora <span className="text-sm italic text-champagne">Atelier</span></span>
                <button className="grid h-10 w-10 place-items-center rounded-full border border-ivory/20" onClick={() => setMenu(false)} aria-label="Close menu">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <nav aria-label="Studio sections (mobile)" className="flex-1 overflow-y-auto px-5 pb-10">
                <ol className="space-y-1">
                  {atelierScreens.map((s, i) => (
                    <motion.li key={s.slug} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}>
                      <Link href={`${ATELIER_BASE}/${s.slug}`} className="flex items-baseline gap-4 py-2 font-serif text-3xl">
                        <span className="w-6 text-xs text-champagne tabular">{String(i + 1).padStart(2, "0")}</span>
                        <span className={pathname.endsWith(s.slug) ? "italic text-champagne" : ""}>{s.label}</span>
                      </Link>
                    </motion.li>
                  ))}
                </ol>
                <div className="mt-8 flex items-center gap-2 text-xs text-ivory/70">Preview state <span className="rounded-full bg-ivory p-0.5"><StateSwitch /></span></div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <main id="main" className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 md:px-10">
          <AnimatePresence mode="wait">
            <motion.div key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="border-t border-parchment py-8 text-center text-xs text-stone">Nexora Atelier · Concept A preview · {DEMO_NOTICE}</footer>
      </div>
    </PreviewStateProvider>
  );
}
