"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { Chip, Glow, NeonButton, ScreenHeader, Title } from "../ui";
import { auditLog, integrations, roles, team, type Integration } from "@/lib/demo-data";
import { cn } from "@/lib/format";

const STATUS_COLOR: Record<Integration["status"], string> = { "Demo fixture": "#22d3ee", "Not connected": "#2a2a40", Error: "#f472b6" };

function Constellation({ sel, onSel }: { sel: string; onSel: (n: string) => void }) {
  const R = 150, C = 200;
  return (
    <svg viewBox="0 0 400 400" className="mx-auto h-auto w-full max-w-[420px]" role="group" aria-label="Integration constellation">
      <circle cx={C} cy={C} r={R} fill="none" stroke="#2a2a40" strokeDasharray="2 6" />
      {integrations.map((i, k) => {
        const a = (k / integrations.length) * Math.PI * 2 - Math.PI / 2;
        const x = C + Math.cos(a) * R, y = C + Math.sin(a) * R;
        const col = STATUS_COLOR[i.status];
        const active = sel === i.name;
        return (
          <g key={i.name}>
            <line x1={C} y1={C} x2={x} y2={y} stroke={col} strokeOpacity={i.status === "Not connected" ? 0.5 : 0.7} strokeDasharray={i.status === "Demo fixture" ? "4 4" : i.status === "Error" ? "1 5" : "0"} className={i.status !== "Not connected" ? "animate-dash" : undefined} />
            <g onClick={() => onSel(i.name)} className="cursor-pointer" role="button" tabIndex={0} aria-pressed={active} onKeyDown={(e) => e.key === "Enter" && onSel(i.name)}>
              <circle cx={x} cy={y} r={active ? 18 : 14} fill="#12121e" stroke={active ? "#fff" : col} strokeWidth={active ? 2 : 1.5} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="9" fill="#fff" fontFamily="var(--font-mono)">{i.name.slice(0, 2).toUpperCase()}</text>
              <text x={x} y={y + (y > C ? 32 : -24)} textAnchor="middle" fontSize="9.5" fill="#9a9ab8">{i.name}</text>
            </g>
          </g>
        );
      })}
      <motion.circle cx={C} cy={C} r="40" fill="url(#core)" animate={{ r: [38, 44, 38] }} transition={{ duration: 3, repeat: Infinity }} />
      <defs><radialGradient id="core"><stop offset="0" stopColor="#c4b5fd" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0.2" /></radialGradient></defs>
      <text x={C} y={C + 4} textAnchor="middle" fontSize="11" fill="#fff" fontWeight={700}>NEXORA</text>
    </svg>
  );
}

export default function Systems() {
  const [sel, setSel] = useState(integrations[8].name);
  const i = integrations.find((x) => x.name === sel)!;
  return (
    <div>
      <ScreenHeader code="CMD-10 · SYSTEMS" title="Systems & access" sub="Integrations, roles, credentials and the audit trail for this client workspace. Data never crosses workspace boundaries." />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Glow>
          <Title kicker="Integration constellation" right={<div className="flex gap-1.5"><Chip tone="cyan">fixture</Chip><Chip tone="magenta">error</Chip><Chip>off</Chip></div>}>Data links</Title>
          <Constellation sel={sel} onSel={setSel} />
        </Glow>
        <div className="space-y-5">
          <Glow active>
            <div className="flex items-center justify-between"><p className="text-xl font-bold text-white">{i.name}</p><Chip tone={i.status === "Error" ? "magenta" : i.status === "Demo fixture" ? "cyan" : "rim"} pulse={i.status === "Error"}>{i.status}</Chip></div>
            <p className="font-mono text-[11px] text-haze">{i.category} · scopes: {i.scopes}</p>
            <p className="mt-3 text-sm text-haze">{i.note}</p>
            <NeonButton className="mt-4 w-full" variant={i.status === "Error" ? "danger" : "primary"}>{i.status === "Error" ? "Re-authenticate" : i.status === "Demo fixture" ? "Replace fixture with OAuth" : "Connect"}</NeonButton>
            <p className="mt-2 text-center font-mono text-[10px] text-haze">Paid APIs require cost review & explicit approval before activation.</p>
          </Glow>
          <Glow>
            <Title kicker="Credentials" right={<NeonButton variant="ghost" className="py-1 text-xs"><KeyRound className="h-3.5 w-3.5" aria-hidden /> New key</NeonButton>}>API keys</Title>
            <ul className="space-y-2 font-mono text-[11.5px]">
              <li className="flex justify-between rounded-lg border border-rim p-2"><span className="text-white">reporting · read</span><span className="text-haze">nx_live_••••7c2a</span></li>
              <li className="flex justify-between rounded-lg border border-rim p-2"><span className="text-white">warehouse · export</span><span className="text-haze">nx_live_••••19fe</span></li>
            </ul>
            <p className="mt-2 flex items-center gap-1 font-mono text-[10px] text-haze"><ShieldCheck className="h-3 w-3 text-lime-pulse" aria-hidden /> example values · hashed at rest</p>
          </Glow>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Glow>
          <Title kicker="Crew" right={<NeonButton variant="ghost" className="py-1 text-xs"><UserPlus className="h-3.5 w-3.5" aria-hidden /> Invite</NeonButton>}>Members & roles</Title>
          <ul className="space-y-2">
            {team.map((m) => (
              <li key={m.email} className="flex items-center gap-3 rounded-xl border border-rim p-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet/60 to-cyan/40 font-mono text-[10px] text-white">{m.name.split(" ").map((p) => p[0]).slice(-2).join("")}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm text-white">{m.name}</span><span className="font-mono text-[10px] text-haze">{m.lastActive}</span></span>
                <Chip tone={m.role === "Owner" ? "violet" : m.role.startsWith("Client") ? "magenta" : "rim"}>{m.role}</Chip>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[10px] text-haze">{roles.length} roles · least-privilege defaults · client viewers see approved reports only</p>
        </Glow>
        <Glow>
          <Title kicker="Immutable">Audit trail</Title>
          <ul className="space-y-1.5 font-mono text-[11px]">
            {auditLog.map((a, k) => (
              <motion.li key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: k * 0.05 }} className="grid grid-cols-[70px_1fr] gap-2 rounded-lg border border-rim/60 p-2">
                <span className="text-haze">{a.at}</span>
                <span><span className={cn(a.kind === "error" ? "text-magenta" : a.kind === "ai" ? "text-violet-soft" : "text-cyan")}>{a.actor}</span> <span className="text-white">{a.action}</span> <span className="text-haze">→ {a.target}</span></span>
              </motion.li>
            ))}
          </ul>
        </Glow>
      </div>
    </div>
  );
}
