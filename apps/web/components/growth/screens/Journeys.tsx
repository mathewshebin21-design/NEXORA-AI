"use client";

import { useState } from "react";
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { Badge, Gate, Panel, growthTooltip } from "../ui";
import { funnel, journey } from "@/lib/demo-data";
import { cn, fmtPct } from "@/lib/format";

const NODES = [
  "Cart started", "Consent check", "Email 1", "No consent (exit)", "Wait 24h", "Opened?", "Email 2", "SMS", "No further action", "Purchase",
];
const LINKS = [
  [0, 1, 5330], [1, 2, 3091], [1, 3, 2239], [2, 9, 268], [2, 4, 2823], [4, 5, 2823], [5, 6, 1270], [5, 7, 311], [5, 8, 1242], [6, 9, 121], [7, 9, 22],
].map(([source, target, value]) => ({ source, target, value }));

type NodeProps = { x: number; y: number; width: number; height: number; index: number; payload: { name: string; value: number } };
function SankeyNode({ x, y, width, height, index, payload }: NodeProps) {
  const exit = payload.name.includes("exit") || payload.name.includes("No further");
  const goal = payload.name === "Purchase";
  return (
    <Layer key={`n-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={goal ? "#2ec5b6" : exit ? "#ff6b6b" : "#3d7bff"} fillOpacity={0.9} radius={2} />
      <text x={x + width + 6} y={y + height / 2} textAnchor="start" dominantBaseline="middle" fontSize={11} fill="#e6ecff">
        {payload.name} <tspan fill="#a7b3d1">{payload.value.toLocaleString()}</tspan>
      </text>
    </Layer>
  );
}

export default function Journeys() {
  const [hover, setHover] = useState<number | null>(null);
  const top = funnel[0].value;
  return (
    <div className="space-y-4">
      <Panel title="Site conversion funnel" subtitle="Last 90 days · hover a stage for drop-off · sources per stage" actions={<Badge tone="amber">Synthetic</Badge>}>
        <Gate chart>
          <div className="grid gap-2 md:grid-cols-5">
            {funnel.map((f, i) => {
              const conv = i ? f.value / funnel[i - 1].value : 1;
              return (
                <div key={f.stage} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={cn("rounded-lg border p-3 transition", hover === i ? "border-electric bg-electric/10" : "border-slate-line/60")}>
                  <p className="text-[11px] uppercase tracking-wider text-mist">{i + 1}. {f.stage}</p>
                  <p className="mt-1 font-mono text-xl text-white">{f.value.toLocaleString()}</p>
                  <div className="mt-2 h-24 rounded bg-navy-3/60 p-1">
                    <div className="flex h-full items-end"><div className="w-full rounded-sm bg-gradient-to-t from-electric to-electric-soft transition-all" style={{ height: `${Math.max(3, (f.value / top) * 100)}%` }} /></div>
                  </div>
                  <p className="mt-2 font-mono text-[11px]">{i ? <><span className="text-teal">{fmtPct(conv)}</span> <span className="text-mist">step · </span><span className="text-coral-signal">−{(funnel[i - 1].value - f.value).toLocaleString()}</span></> : <span className="text-mist">entry</span>}</p>
                  <p className="mt-1 text-[10px] text-mist">{f.source}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 font-mono text-[11px] text-mist">Overall session → purchase: <span className="text-white">{fmtPct(funnel[4].value / top, 2)}</span></p>
        </Gate>
      </Panel>

      <Panel title={`Journey flow · ${journey.name}`} subtitle="30-day dry run on synthetic profiles · nothing sent" actions={<Badge tone="amber">{journey.status}</Badge>}>
        <Gate chart>
          <div className="overflow-x-auto scrollbar-thin" tabIndex={0} role="region" aria-label="Scrollable content">
            <div className="h-[380px] min-w-[820px]">
              <ResponsiveContainer>
                <Sankey data={{ nodes: NODES.map((name) => ({ name })), links: LINKS }} nodePadding={26} nodeWidth={10} margin={{ left: 10, right: 170, top: 10, bottom: 10 }} node={SankeyNode as never} link={{ stroke: "#3d7bff", strokeOpacity: 0.22 }}>
                  <Tooltip {...growthTooltip} />
                </Sankey>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-[11.5px] text-mist md:grid-cols-4">
            <p>• Consent gate removes {fmtPct(2239 / 5330, 0)} of entrants before any message.</p>
            <p>• SMS only to SMS-consented profiles.</p>
            <p>• Frequency cap 3 / 7 days · exits on purchase.</p>
            <p>• Purchases measured in Shopify orders, not ESP clicks.</p>
          </div>
        </Gate>
      </Panel>
    </div>
  );
}
