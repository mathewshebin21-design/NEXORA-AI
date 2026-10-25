"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[12px] font-medium text-white">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="mt-1 text-[11px] text-mist">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-coral-signal" role="alert">{error}</p>}
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-slate-line bg-midnight/70 px-3 py-2 text-[13px] text-white placeholder:text-mist/60 focus:border-electric focus:outline-none disabled:opacity-60";

export function Btn({ children, variant = "primary", busy, className, ...rest }: { children: ReactNode; variant?: "primary" | "ghost" | "danger"; busy?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-electric text-white hover:bg-electric/85",
        variant === "ghost" && "border border-slate-line text-white hover:bg-navy-3",
        variant === "danger" && "border border-coral-signal/60 text-coral-signal hover:bg-coral-signal/10",
        className,
      )}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warn"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-[12.5px]",
        tone === "info" && "border-electric/40 bg-electric/10 text-electric-soft",
        tone === "error" && "border-coral-signal/40 bg-coral-signal/10 text-coral-signal",
        tone === "success" && "border-teal/40 bg-teal/10 text-teal",
        tone === "warn" && "border-amber-signal/40 bg-amber-signal/10 text-amber-signal",
      )}
    >
      {children}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-mist" role="status" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}…
    </div>
  );
}
