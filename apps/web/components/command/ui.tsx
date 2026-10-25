"use client";

import { motion } from "motion/react";
import { RadioTower, RotateCw, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { usePreviewState } from "@/lib/preview-state";

export function Glow({ children, className, active = false, as: As = "div" }: { children: ReactNode; className?: string; active?: boolean; as?: "div" | "section" | "article" }) {
  return (
    <As
      className={cn(
        "relative rounded-2xl border bg-gradient-to-b from-carbon-2/80 to-carbon/80 p-5 backdrop-blur",
        active ? "border-violet/60 shadow-[0_0_0_1px_rgba(139,92,246,0.35),0_0_40px_-8px_rgba(139,92,246,0.55)]" : "border-rim",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Title({ kicker, children, right }: { kicker: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-cyan">{kicker}</p>
        <h2 className="mt-1 font-grotesk text-lg font-semibold text-white">{children}</h2>
      </div>
      {right}
    </div>
  );
}

export function ScreenHeader({ code, title, sub, right }: { code: string; title: string; sub: string; right?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="font-mono text-[11px] tracking-[0.3em] text-violet-soft">{code}</p>
        <motion.h1 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mt-1 bg-gradient-to-r from-white via-violet-soft to-cyan bg-clip-text font-grotesk text-3xl font-bold tracking-tight text-transparent md:text-4xl">
          {title}
        </motion.h1>
        <p className="mt-1 max-w-2xl text-sm text-haze">{sub}</p>
      </div>
      {right && <div className="flex flex-wrap gap-2">{right}</div>}
    </header>
  );
}

export function Chip({ children, tone = "rim", pulse = false }: { children: ReactNode; tone?: "rim" | "violet" | "cyan" | "magenta" | "lime"; pulse?: boolean }) {
  const color = { rim: "text-haze border-rim", violet: "text-violet-soft border-violet/40 bg-violet/10", cyan: "text-cyan border-cyan/40 bg-cyan/10", magenta: "text-magenta border-magenta/40 bg-magenta/10", lime: "text-lime-pulse border-lime-pulse/40 bg-lime-pulse/10" }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider", color)}>
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-current" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

export function NeonButton({ children, variant = "primary", className, ...rest }: { children: ReactNode; variant?: "primary" | "ghost" | "danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-grotesk text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-gradient-to-r from-violet to-cyan/80 text-white shadow-[0_0_24px_-6px_rgba(139,92,246,0.8)] hover:brightness-110",
        variant === "ghost" && "border border-rim text-white hover:border-violet/60 hover:bg-violet/10",
        variant === "danger" && "border border-magenta/50 text-magenta hover:bg-magenta/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Meter({ value, color = "violet" }: { value: number; color?: "violet" | "cyan" | "magenta" | "lime" }) {
  const c = { violet: "from-violet to-violet-soft", cyan: "from-cyan to-cyan-soft", magenta: "from-magenta to-violet", lime: "from-lime-pulse to-cyan" }[color];
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-rim/70">
      <motion.div className={cn("h-full rounded-full bg-gradient-to-r", c)} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} transition={{ duration: 1, ease: "easeOut" }} />
    </div>
  );
}

export function Gate({ children, className, h = "h-40" }: { children: ReactNode; className?: string; h?: string }) {
  const { state, retry, setState } = usePreviewState();
  if (state === "loading")
    return (
      <div className={cn("relative overflow-hidden rounded-xl border border-rim bg-carbon", h, className)} aria-busy="true">
        <span className="sr-only">Loading</span>
        <div className="absolute inset-x-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-violet/20 to-transparent" />
        <div className="grid h-full place-items-center font-mono text-[11px] tracking-[0.3em] text-violet-soft">SYNCING TELEMETRY…</div>
      </div>
    );
  if (state === "empty")
    return (
      <div className={cn("grid place-items-center rounded-xl border border-dashed border-rim p-6 text-center", h, className)}>
        <div>
          <RadioTower className="mx-auto h-6 w-6 text-cyan" aria-hidden />
          <p className="mt-2 font-grotesk text-white">No signal</p>
          <p className="mt-1 text-xs text-haze">No records in this channel yet. Launch a mission or connect a source.</p>
          <button onClick={() => setState("live")} className="mt-3 rounded-lg border border-rim px-3 py-1 font-mono text-[11px] text-cyan hover:border-cyan">LOAD SAMPLE</button>
        </div>
      </div>
    );
  if (state === "error")
    return (
      <div role="alert" className={cn("grid place-items-center rounded-xl border border-magenta/40 bg-magenta/5 p-6 text-center", h, className)}>
        <div>
          <TriangleAlert className="mx-auto h-6 w-6 text-magenta" aria-hidden />
          <p className="mt-2 font-grotesk text-white">Link lost to data plane</p>
          <p className="mt-1 font-mono text-[11px] text-haze">ERR_UPSTREAM_503 · simulated · trace nx-c-91be</p>
          <button onClick={retry} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-magenta/50 px-3 py-1 font-mono text-[11px] text-magenta"><RotateCw className="h-3 w-3" aria-hidden /> RE-ESTABLISH</button>
        </div>
      </div>
    );
  return <motion.div initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} transition={{ duration: 0.5 }} className={className}>{children}</motion.div>;
}

export const commandTooltip = {
  contentStyle: { background: "rgba(11,11,20,0.95)", border: "1px solid #2a2a40", borderRadius: 12, fontSize: 12, color: "#ececff", boxShadow: "0 0 30px -6px rgba(139,92,246,0.5)" },
  labelStyle: { color: "#22d3ee", fontFamily: "var(--font-mono)", fontSize: 11 },
};
export const cAxis = { tick: { fontSize: 10.5, fill: "#6e6e8f", fontFamily: "var(--font-mono)" }, tickLine: false, axisLine: false } as const;
