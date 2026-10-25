"use client";

import { motion } from "motion/react";
import { AlertCircle, Feather, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { usePreviewState } from "@/lib/preview-state";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-semibold uppercase tracking-[0.22em] text-champagne-deep", className)}>{children}</p>;
}

export function PageHeader({ eyebrow, title, intro, actions }: { eyebrow: string; title: ReactNode; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-6 border-b border-parchment pb-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight text-graphite md:text-[3.4rem]">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-graphite-soft">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Button({
  children,
  variant = "solid",
  className,
  ...rest
}: { children: ReactNode; variant?: "solid" | "ghost" | "gold" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 disabled:opacity-50",
        variant === "solid" && "bg-graphite text-ivory hover:bg-graphite-soft",
        variant === "ghost" && "border border-graphite/20 text-graphite hover:border-graphite hover:bg-ivory-deep",
        variant === "gold" && "bg-champagne text-graphite hover:bg-champagne-deep hover:text-ivory",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 rounded-[22px] border border-parchment/80 bg-white/70 p-6 shadow-[0_1px_0_rgba(35,33,30,0.04)]", className)}>{children}</div>;
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "gold" | "sage" | "rose" | "dark" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        tone === "neutral" && "bg-ivory-deep text-graphite-soft",
        tone === "gold" && "bg-champagne-soft text-champagne-deep",
        tone === "sage" && "bg-[#e3e8dc] text-[#4d5a41]",
        tone === "rose" && "bg-[#f1ddd8] text-rosewood",
        tone === "dark" && "bg-graphite text-ivory",
      )}
    >
      {children}
    </span>
  );
}

export function Stat({ label, value, note, delta }: { label: string; value: string; note?: string; delta?: { v: string; up: boolean } }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-stone">{label}</p>
      <p className="mt-2 font-serif text-[2.4rem] leading-none tracking-tight text-graphite tabular">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs text-graphite-soft">
        {delta && <span className={delta.up ? "text-[#4d5a41]" : "text-rosewood"}>{delta.v}</span>}
        {note && <span>{note}</span>}
      </div>
    </div>
  );
}

/** Editorial treatment of loading / empty / error states. */
export function Gate({ children, emptyTitle = "Nothing here yet", emptyBody, rows = 3, className }: { children: ReactNode; emptyTitle?: string; emptyBody?: string; rows?: number; className?: string }) {
  const { state, retry, setState } = usePreviewState();
  if (state === "loading")
    return (
      <div className={cn("space-y-3", className)} aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading</span>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton h-14 rounded-2xl" style={{ ["--sk-a" as string]: "#efe8da", ["--sk-b" as string]: "#f8f4ec", width: `${100 - i * 9}%` }} />
        ))}
      </div>
    );
  if (state === "empty")
    return (
      <div className={cn("flex flex-col items-center rounded-[22px] border border-dashed border-champagne/60 bg-ivory px-6 py-12 text-center", className)}>
        <Feather className="h-6 w-6 text-champagne-deep" aria-hidden />
        <p className="mt-3 font-serif text-2xl text-graphite">{emptyTitle}</p>
        <p className="mt-2 max-w-sm text-sm text-graphite-soft">{emptyBody ?? "Connect a data source or start a draft to see work appear here."}</p>
        <Button variant="ghost" className="mt-5" onClick={() => setState("live")}>Load sample workspace</Button>
      </div>
    );
  if (state === "error")
    return (
      <div role="alert" className={cn("flex flex-col items-start gap-3 rounded-[22px] border border-rosewood/30 bg-[#f7ebe7] p-6", className)}>
        <div className="flex items-center gap-2 text-rosewood">
          <AlertCircle className="h-5 w-5" aria-hidden />
          <p className="font-serif text-xl">We couldn&rsquo;t refresh this section</p>
        </div>
        <p className="text-sm text-graphite-soft">The source responded with an error (simulated). Your last saved data is unaffected. Error ref: NX-PREVIEW-503.</p>
        <Button variant="ghost" onClick={retry}><RotateCcw className="h-4 w-4" aria-hidden /> Try again</Button>
      </div>
    );
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className={cn("min-w-0", className)}>
      {children}
    </motion.div>
  );
}

export function Rule({ label }: { label: string }) {
  return (
    <div className="my-10 flex items-center gap-4">
      <span className="h-px flex-1 bg-parchment" />
      <span className="font-serif text-sm italic text-stone">{label}</span>
      <span className="h-px flex-1 bg-parchment" />
    </div>
  );
}

export const atelierTooltip = {
  contentStyle: { background: "#23211e", border: "none", borderRadius: 12, color: "#f8f4ec", fontSize: 12, padding: "8px 12px" },
  labelStyle: { color: "#c8a96a", fontFamily: "var(--font-serif)" },
  itemStyle: { color: "#f8f4ec" },
};
