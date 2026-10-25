"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { AlertOctagon, ArrowDown, ArrowUp, ChevronsUpDown, DatabaseZap, RefreshCw } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/format";
import { usePreviewState } from "@/lib/preview-state";
import { CHANNELS, daily, type Channel } from "@/lib/demo-data";
import { GROWTH_BASE } from "@/lib/screens";

/** Base path for in-app links, so the same screens work in the preview and in the product shell. */
export const BaseCtx = createContext<string>(GROWTH_BASE);
export const useBase = () => useContext(BaseCtx);

/* ---------------------------------------------------------- Global filters */
export type Range = 30 | 60 | 90;
type Filters = { range: Range; setRange: (r: Range) => void; channels: Channel[]; toggleChannel: (c: Channel) => void; compare: boolean; setCompare: (b: boolean) => void };
const FilterCtx = createContext<Filters | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<Range>(30);
  const [channels, setChannels] = useState<Channel[]>([...CHANNELS]);
  const [compare, setCompare] = useState(true);
  const toggleChannel = (c: Channel) => setChannels((xs) => (xs.includes(c) ? (xs.length > 1 ? xs.filter((x) => x !== c) : xs) : [...xs, c]));
  return <FilterCtx.Provider value={{ range, setRange, channels, toggleChannel, compare, setCompare }}>{children}</FilterCtx.Provider>;
}
export const useFilters = () => useContext(FilterCtx)!;
export const useRangeDaily = () => {
  const { range } = useFilters();
  return useMemo(() => daily.slice(-range), [range]);
};

/* ---------------------------------------------------------------- Pieces */
export function Panel({ title, subtitle, actions, children, className, bodyClass }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-xl border border-slate-line/70 bg-navy-2/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]", className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-line/60 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold tracking-tight text-white">{title}</h2>
          {subtitle && <p className="truncate text-[11px] text-mist">{subtitle}</p>}
        </div>
        {actions && <div className="flex max-w-full flex-wrap items-center gap-1.5">{actions}</div>}
      </header>
      <div className={cn("flex-1 p-4", bodyClass)}>{children}</div>
    </section>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "blue" | "teal" | "amber" | "coral" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium",
        tone === "slate" && "bg-slate-line/60 text-mist",
        tone === "blue" && "bg-electric/15 text-electric-soft",
        tone === "teal" && "bg-teal/15 text-teal",
        tone === "amber" && "bg-amber-signal/15 text-amber-signal",
        tone === "coral" && "bg-coral-signal/15 text-coral-signal",
      )}
    >
      {children}
    </span>
  );
}

export function Delta({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null || !Number.isFinite(value)) return <span className="text-mist">—</span>;
  const good = inverse ? value < 0 : value > 0;
  const Icon = value >= 0 ? ArrowUp : ArrowDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-mono text-[11px]", good ? "text-teal" : "text-coral-signal")}>
      <Icon className="h-3 w-3" aria-hidden />
      {Math.abs(value * 100).toFixed(1)}%
    </span>
  );
}

export function Kpi({ label, value, delta, inverse, spark, formula }: { label: string; value: string; delta: number | null; inverse?: boolean; spark?: number[]; formula?: string }) {
  const data = (spark ?? []).map((v, i) => ({ i, v }));
  const gid = `k-${label.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-line/70 bg-navy-2/70 p-4" title={formula}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-mist">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="font-mono text-2xl font-semibold tracking-tight text-white tabular">{value}</p>
        <Delta value={delta} inverse={inverse} />
      </div>
      {spark && (
        <div className="mt-2 h-9">
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#3d7bff" stopOpacity={0.5} />
                  <stop offset="1" stopColor="#3d7bff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="#3d7bff" strokeWidth={1.4} fill={`url(#${gid})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {formula && <p className="mt-1 truncate font-mono text-[10px] text-mist/70">{formula}</p>}
    </div>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full flex-wrap rounded-lg border border-slate-line bg-midnight/60 p-0.5">
      {options.map((o) => (
        <button key={String(o.id)} role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={cn("relative rounded-md px-2.5 py-1 text-[11.5px] font-medium transition", value === o.id ? "text-white" : "text-mist hover:text-white")}>
          {value === o.id && <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-md bg-electric/25 ring-1 ring-electric/50" />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function IconButton({ children, label, onClick }: { children: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="grid h-7 w-7 place-items-center rounded-md text-mist hover:bg-navy-3 hover:text-white">
      {children}
    </button>
  );
}

export function Gate({ children, rows = 4, className, chart = false }: { children: ReactNode; rows?: number; className?: string; chart?: boolean }) {
  const { state, retry, setState } = usePreviewState();
  if (state === "loading")
    return (
      <div className={cn("space-y-2", className)} aria-busy="true">
        <span className="sr-only">Loading</span>
        {chart ? (
          <div className="skeleton h-56 rounded-lg" style={{ ["--sk-a" as string]: "#111c3d", ["--sk-b" as string]: "#1b2a57" }} />
        ) : (
          Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-8 rounded-md" style={{ ["--sk-a" as string]: "#111c3d", ["--sk-b" as string]: "#1b2a57" }} />)
        )}
      </div>
    );
  if (state === "empty")
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-line py-10 text-center", className)}>
        <DatabaseZap className="h-5 w-5 text-electric-soft" aria-hidden />
        <p className="text-sm font-medium text-white">No data for this selection</p>
        <p className="max-w-xs text-xs text-mist">Widen the date range, include more channels, or connect a source in Settings → Integrations.</p>
        <button onClick={() => setState("live")} className="mt-2 rounded-md border border-slate-line px-3 py-1 text-xs text-white hover:bg-navy-3">Reset filters</button>
      </div>
    );
  if (state === "error")
    return (
      <div role="alert" className={cn("flex items-start gap-3 rounded-lg border border-coral-signal/40 bg-coral-signal/10 p-4", className)}>
        <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-coral-signal" aria-hidden />
        <div className="text-xs">
          <p className="font-semibold text-white">Query failed · 503 upstream timeout (simulated)</p>
          <p className="mt-1 text-mist">Cached values from 10:42 UTC are retained. Trace: nx-q-7f3a.</p>
          <button onClick={retry} className="mt-2 inline-flex items-center gap-1 rounded-md bg-coral-signal/20 px-2 py-1 font-medium text-white hover:bg-coral-signal/30"><RefreshCw className="h-3 w-3" aria-hidden /> Retry query</button>
        </div>
      </div>
    );
  return <div className={className}>{children}</div>;
}

export type Col<T> = { key: string; label: string; align?: "right"; render: (r: T) => ReactNode; sort?: (r: T) => number | string };

export function DataTable<T>({ rows, cols, rowKey, onRow, selected, dense }: { rows: T[]; cols: Col<T>[]; rowKey: (r: T) => string; onRow?: (r: T) => void; selected?: string | null; dense?: boolean }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(-1);
  const sorted = useMemo(() => {
    const col = cols.find((c) => c.key === sortKey);
    if (!col?.sort) return rows;
    return [...rows].sort((a, b) => {
      const x = col.sort!(a), y = col.sort!(b);
      return (x > y ? 1 : x < y ? -1 : 0) * dir;
    });
  }, [rows, cols, sortKey, dir]);
  return (
    <div className="overflow-x-auto scrollbar-thin" tabIndex={0} role="region" aria-label="Scrollable table">
      <table className="w-full min-w-[640px] text-[12.5px]">
        <thead>
          <tr className="border-b border-slate-line text-left text-[10.5px] uppercase tracking-wider text-mist">
            {cols.map((c) => (
              <th key={c.key} scope="col" aria-sort={sortKey === c.key ? (dir === 1 ? "ascending" : "descending") : undefined} className={cn("px-2 pb-2 font-medium", c.align === "right" && "text-right")}>
                {c.sort ? (
                  <button onClick={() => { if (sortKey === c.key) setDir((d) => (d === 1 ? -1 : 1)); else { setSortKey(c.key); setDir(-1); } }} className={cn("inline-flex items-center gap-1 hover:text-white", c.align === "right" && "flex-row-reverse")}>
                    {c.label}
                    {sortKey === c.key ? (dir === 1 ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />) : <ChevronsUpDown className="h-3 w-3 opacity-50" aria-hidden />}
                  </button>
                ) : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const k = rowKey(r);
            return (
              <tr key={k} onClick={onRow ? () => onRow(r) : undefined} className={cn("border-b border-slate-line/50 transition", onRow && "cursor-pointer hover:bg-navy-3/60", selected === k && "bg-electric/10")}>
                {cols.map((c) => <td key={c.key} className={cn("px-2", dense ? "py-1.5" : "py-2.5", c.align === "right" && "text-right font-mono tabular")}>{c.render(r)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const growthTooltip = {
  contentStyle: { background: "#0c1530", border: "1px solid #23315c", borderRadius: 8, fontSize: 12, color: "#e6ecff", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" },
  labelStyle: { color: "#a7b3d1", fontSize: 11 },
  itemStyle: { padding: 0 },
};
export const axisProps = { tick: { fontSize: 10.5, fill: "#7e8bb0" }, tickLine: false, axisLine: false } as const;
export const GRID = "#1c2a55";
