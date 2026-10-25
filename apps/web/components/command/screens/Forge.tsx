"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ScanLine, ShieldAlert, ShieldCheck, Wand2 } from "lucide-react";
import { Chip, Gate, Glow, NeonButton, ScreenHeader, Title } from "../ui";
import { useAgents } from "../Shell";
import { assets, brandVoice } from "@/lib/demo-data";
import { cn } from "@/lib/format";

/** Phrases the rule-based claims scanner flags (preview rule set). */
const RISKY = [/best-selling[^.]*/i, /chefs swear by/i, /guaranteed?/i, /#1\b/i, /clinically/i];

function highlight(text: string) {
  const parts: { t: string; bad: boolean }[] = [];
  let rest = text;
  while (rest.length) {
    let hit: RegExpExecArray | null = null;
    for (const r of RISKY) { const m = r.exec(rest); if (m && (!hit || m.index < hit.index)) hit = m; }
    if (!hit) { parts.push({ t: rest, bad: false }); break; }
    if (hit.index) parts.push({ t: rest.slice(0, hit.index), bad: false });
    parts.push({ t: hit[0], bad: true });
    rest = rest.slice(hit.index + hit[0].length);
  }
  return parts;
}

export default function Forge() {
  const [sel, setSel] = useState(assets[2].id);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const { agents, approve, push } = useAgents();
  const a = assets.find((x) => x.id === sel)!;
  const gated = agents.find((x) => x.needsApproval);
  const parts = highlight(`${a.headline} ${a.body}`);
  const flagged = parts.filter((p) => p.bad).length;

  useEffect(() => { setScanned(false); }, [sel]);
  const scan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); setScanned(true); push(`claims.scanner  ${a.id} → ${flagged} flagged phrase(s)`); }, 1400);
  };

  return (
    <div>
      <ScreenHeader code="CMD-03 · FORGE" title="Creative forge" sub="Draft, scan and approve. The claims scanner checks copy against the approved-claims sheet before any human sees it." />
      <div className="grid gap-5 xl:grid-cols-[280px_1fr_300px]">
        <Glow className="p-3">
          <p className="px-2 pb-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-haze">Assets</p>
          <Gate h="h-72">
            <ul className="space-y-1.5">
              {assets.map((x) => (
                <li key={x.id}>
                  <button onClick={() => setSel(x.id)} aria-pressed={sel === x.id} className={cn("w-full rounded-xl border p-2.5 text-left transition", sel === x.id ? "border-violet/60 bg-violet/10" : "border-transparent hover:border-rim")}>
                    <div className="flex items-center justify-between"><span className="font-mono text-[10px] text-haze">{x.id} · v{x.version}</span><span className={cn("font-mono text-[11px]", x.brandScore >= 85 ? "text-lime-pulse" : x.brandScore >= 75 ? "text-cyan" : "text-magenta")}>{x.brandScore}</span></div>
                    <p className="mt-0.5 text-[13px] text-white">{x.title}</p>
                    <p className="font-mono text-[10px] text-haze">{x.type} · {x.status}</p>
                  </button>
                </li>
              ))}
            </ul>
          </Gate>
        </Glow>

        <Glow active={scanning}>
          <Title kicker={`${a.type} · ${a.campaign}`} right={<NeonButton variant="ghost" onClick={scan} disabled={scanning}><ScanLine className="h-4 w-4" aria-hidden /> {scanning ? "Scanning…" : "Run claims scan"}</NeonButton>}>{a.title}</Title>
          <div className="relative overflow-hidden rounded-2xl border border-rim bg-void/70 p-6">
            {scanning && <div className="pointer-events-none absolute inset-x-0 h-16 animate-scan bg-gradient-to-b from-transparent via-cyan/25 to-transparent" aria-hidden />}
            <p className="text-2xl font-semibold leading-snug text-white">
              {highlight(a.headline).map((p, i) => <span key={i} className={cn(scanned && p.bad && "rounded bg-magenta/25 text-magenta underline decoration-wavy underline-offset-4")}>{p.t}</span>)}
            </p>
            <p className="mt-3 leading-relaxed text-haze">
              {highlight(a.body).map((p, i) => <span key={i} className={cn(scanned && p.bad && "rounded bg-magenta/25 text-magenta underline decoration-wavy underline-offset-4")}>{p.t}</span>)}
            </p>
          </div>
          <AnimatePresence>
            {scanned && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className={cn("mt-4 flex items-start gap-3 rounded-xl border p-3 text-sm", flagged ? "border-magenta/40 bg-magenta/5" : "border-lime-pulse/40 bg-lime-pulse/5")}>
                {flagged ? <ShieldAlert className="h-5 w-5 shrink-0 text-magenta" aria-hidden /> : <ShieldCheck className="h-5 w-5 shrink-0 text-lime-pulse" aria-hidden />}
                <span>{flagged ? `${flagged} phrase(s) assert claims with no supporting source on file. Remove, or attach substantiation before approval.` : "No unsupported claims detected by the rule set. Human review still required."}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {a.checks.map((c, i) => (
              <li key={i} className="rounded-xl border border-rim bg-carbon/60 p-3 text-[12.5px]"><Chip tone={c.state === "pass" ? "lime" : c.state === "warn" ? "cyan" : "magenta"}>{c.state}</Chip><span className="ml-2 text-white">{c.label}</span><p className="mt-1 text-haze">{c.note}</p></li>
            ))}
          </ul>
        </Glow>

        <div className="space-y-5">
          <Glow active={!!gated}>
            <Title kicker="Agent output">Headline variants</Title>
            {gated ? (
              <>
                <p className="text-xs text-haze">{gated.agent} · {gated.task}</p>
                <ol className="mt-3 space-y-2 text-sm text-white">
                  {["Gifts that stay out on the table.", "Wrapped in linen. Made to be used.", "The gift that gets set, not stored."].map((h, i) => <li key={h} className="rounded-xl border border-rim p-2.5"><span className="mr-2 font-mono text-[10px] text-cyan">V{i + 1}</span>{h}</li>)}
                </ol>
                <p className="mt-2 font-mono text-[10px] text-haze">Static example output — no model connected.</p>
                <NeonButton className="mt-3 w-full" onClick={() => approve(gated.id)}><Wand2 className="h-4 w-4" aria-hidden /> Approve variants as drafts</NeonButton>
              </>
            ) : (
              <p className="text-sm text-lime-pulse">All agent outputs reviewed.</p>
            )}
          </Glow>
          <Glow>
            <Title kicker="Brand voice">{brandVoice.name}</Title>
            <div className="space-y-2">
              {brandVoice.traits.map((t) => (
                <div key={t.trait} className="flex items-center gap-2 text-xs"><span className="w-20 text-haze">{t.trait}</span><div className="h-1.5 flex-1 rounded bg-rim"><div className="h-1.5 rounded bg-gradient-to-r from-violet to-cyan" style={{ width: `${t.weight * 100}%` }} /></div></div>
              ))}
            </div>
          </Glow>
        </div>
      </div>
    </div>
  );
}
