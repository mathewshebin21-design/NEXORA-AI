"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/growth/ui";
import { ApiError, api } from "@/lib/api/client";
import type { AuditEntry, AuditPage } from "@/lib/api/types";
import { Btn, Notice, Spinner, inputCls } from "./forms";

const tone = (a: string) => (a.includes("failed") || a.includes("deleted") || a.includes("revoked") || a.includes("removed") ? "coral" : a.startsWith("auth") ? "slate" : a.includes("created") || a.includes("accepted") ? "teal" : "blue");

function summary(e: AuditEntry) {
  const d = e.details ?? {};
  const parts = Object.entries(d).slice(0, 3).map(([k, v]) => {
    if (v && typeof v === "object" && "from" in (v as object)) return `${k}: ${String((v as { from: unknown }).from)} → ${String((v as { to: unknown }).to)}`;
    return `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`;
  });
  return parts.join(" · ");
}

export function AuditTable({ path }: { path: string }) {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const [applied, setApplied] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (after: number | null, action: string) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: "25" });
      if (after) q.set("cursor", String(after));
      if (action) q.set("action", action);
      const page = await api<AuditPage>(`${path}?${q}`);
      setItems((xs) => (after ? [...xs, ...page.items] : page.items));
      setCursor(page.next_cursor);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn’t load the audit log.");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { load(null, applied); }, [load, applied]);

  return (
    <div>
      <form className="mb-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setApplied(filter.trim()); }}>
        <label htmlFor="audit-filter" className="sr-only">Filter by action prefix</label>
        <input id="audit-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by action, e.g. member. or api_key." className={`${inputCls} max-w-xs`} />
        <Btn type="submit" variant="ghost">Filter</Btn>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
      {!error && items.length === 0 && !loading && <p className="py-4 text-[12.5px] text-mist">No audit entries match.</p>}
      <div className="overflow-x-auto scrollbar-thin" tabIndex={0} role="region" aria-label="Audit entries">
        <table className="w-full min-w-[640px] text-[12px]">
          <thead><tr className="border-b border-slate-line text-left text-[10.5px] uppercase tracking-wider text-mist"><th className="px-2 pb-2">When</th><th className="px-2 pb-2">Actor</th><th className="px-2 pb-2">Action</th><th className="px-2 pb-2">Details</th><th className="px-2 pb-2">IP</th></tr></thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-b border-slate-line/50 align-top">
                <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px] text-mist">{new Date(e.created_at).toLocaleString()}</td>
                <td className="px-2 py-2 text-white">{e.actor_label ?? "—"}</td>
                <td className="px-2 py-2"><Badge tone={tone(e.action)}>{e.action}</Badge></td>
                <td className="max-w-md px-2 py-2 font-mono text-[11px] text-mist">{summary(e) || (e.target_type ? `${e.target_type} ${e.target_id?.slice(0, 8)}` : "")}</td>
                <td className="px-2 py-2 font-mono text-[11px] text-mist">{e.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div className="mt-2"><Spinner /></div>}
      {cursor && !loading && <Btn variant="ghost" className="mt-3" onClick={() => load(cursor, applied)}>Load older entries</Btn>}
    </div>
  );
}
