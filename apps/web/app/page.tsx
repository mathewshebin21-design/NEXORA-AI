import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CONCEPTS } from "@/lib/screens";

const DESCRIPTIONS: Record<string, { tagline: string; ia: string; nav: string; motion: string; swatch: string[]; bg: string; fg: string; font: string }> = {
  atelier: {
    tagline: "Creative-first luxury marketing studio",
    ia: "Editorial, story-first. Work flows like a magazine issue: research → brief → creative → edition.",
    nav: "Horizontal serif masthead, full-screen overlay menu on mobile.",
    motion: "Slow fades, image parallax, drawer reveals.",
    swatch: ["#f8f4ec", "#23211e", "#c8a96a", "#7d8b6f"],
    bg: "#f8f4ec",
    fg: "#23211e",
    font: "font-serif",
  },
  growth: {
    tagline: "Executive revenue & marketing intelligence terminal",
    ia: "Data-first, dense. Global filters, cross-filtered charts, drill-down tables, ⌘K command palette.",
    nav: "Collapsible left sidebar + KPI ticker; bottom tab bar on mobile.",
    motion: "Restrained: number tweening, chart transitions, hover crosshairs.",
    swatch: ["#070d1d", "#18264f", "#3d7bff", "#2ec5b6"],
    bg: "#0c1530",
    fg: "#e6ecff",
    font: "font-sans",
  },
  command: {
    tagline: "AI-native campaign operations center",
    ia: "Mission-based. Agents, pipelines and approval gates are first-class; everything is a live workflow.",
    nav: "Glowing icon rail + persistent agent dock; floating dock on mobile.",
    motion: "Rich: animated flows, node graphs, pulsing agents, staged reveals.",
    swatch: ["#05050a", "#12121e", "#8b5cf6", "#22d3ee"],
    bg: "#0b0b14",
    fg: "#ececff",
    font: "font-grotesk",
  },
};

export default function Hub() {
  return (
    <main className="min-h-screen bg-[#fafafa] text-neutral-900 font-sans">
      <div className="mx-auto max-w-6xl px-5 py-12 md:py-20">
        <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">Nexora AI · Phase 1 · Design approval gate</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">Three interactive design directions</h1>
        <p className="mt-4 max-w-2xl text-neutral-600 leading-relaxed">
          Each concept is a working front end with its own information architecture, navigation model, visual identity and interaction patterns. All
          figures are <strong>synthetic demonstration data</strong> for a fictional agency client; no live integrations are connected.
        </p>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {CONCEPTS.map((c) => {
            const d = DESCRIPTIONS[c.id];
            return (
              <article key={c.id} className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-xl">
                <div className="relative h-44 p-6" style={{ background: d.bg, color: d.fg }}>
                  <span className={`${d.font} text-5xl font-semibold opacity-90`}>{c.letter}</span>
                  <p className={`${d.font} mt-2 text-xl`}>{c.name}</p>
                  <div className="absolute bottom-5 right-5 flex gap-1.5">
                    {d.swatch.map((s) => (
                      <span key={s} className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ background: s }} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="font-medium">{d.tagline}</p>
                  <dl className="mt-4 space-y-3 text-sm text-neutral-600">
                    <div><dt className="font-semibold text-neutral-800">Information architecture</dt><dd>{d.ia}</dd></div>
                    <div><dt className="font-semibold text-neutral-800">Navigation</dt><dd>{d.nav}</dd></div>
                    <div><dt className="font-semibold text-neutral-800">Motion</dt><dd>{d.motion}</dd></div>
                  </dl>
                  <div className="mt-6 flex gap-2">
                    <Link href={c.landing} className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
                      Landing page <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </Link>
                    <Link href={`${c.app}/${c.screens[0].slug}`} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
                      Open app
                    </Link>
                  </div>
                  <details className="mt-5 text-sm">
                    <summary className="cursor-pointer text-neutral-500 hover:text-neutral-800">All {c.screens.length + 1} screens</summary>
                    <ul className="mt-2 grid grid-cols-2 gap-1">
                      <li><Link className="underline-offset-2 hover:underline" href={c.landing}>Landing</Link></li>
                      {c.screens.map((s) => (
                        <li key={s.slug}>
                          <Link className="underline-offset-2 hover:underline" href={`${c.app}/${s.slug}`}>{s.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-10 text-sm text-neutral-500">
          Every in-app screen includes a <em>preview states</em> switch to inspect loading, empty and error treatments. Resize to phone width to review each
          concept&rsquo;s mobile navigation.
        </p>
      </div>
    </main>
  );
}
