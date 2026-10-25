"use client";

import Link from "next/link";
import { ArrowRight, Check, Clock } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArtPlate } from "../ArtPlate";
import { Button, Card, Eyebrow, Gate, Pill, Rule, Stat, atelierTooltip } from "../ui";
import { assets, campaigns, daily, liveCampaigns, PERIOD_LABEL, recommendations } from "@/lib/demo-data";
import { roas, sumPerformance } from "@/lib/metrics";
import { fmtCompactCurrency, fmtCurrency, fmtNumber, fmtRatio } from "@/lib/format";
import { ATELIER_BASE } from "@/lib/screens";

export default function Today() {
  const total = sumPerformance(liveCampaigns);
  const lead = campaigns[0];
  const pending = assets.filter((a) => a.status === "In review" || a.status === "Changes requested");
  const rec = recommendations[0];
  const half = daily.length / 2;
  const recent = daily.slice(half).reduce((a, d) => a + d.revenue, 0);
  const prior = daily.slice(0, half).reduce((a, d) => a + d.revenue, 0);

  return (
    <div>
      <section className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:items-end">
        <div>
          <Eyebrow>Saturday, October 24 · Lumen &amp; Oak</Eyebrow>
          <h1 className="mt-4 font-serif text-5xl leading-[1.02] tracking-tight md:text-7xl">
            Good morning, Priya. <span className="italic text-champagne-deep">Autumn is working.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-graphite-soft">
            Store revenue across the last 45 days is {fmtCompactCurrency(recent)} against {fmtCompactCurrency(prior)} in the 45 before. Three pieces of creative await your eye, and
            Counsel has one budget idea worth a conversation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`${ATELIER_BASE}/creative`}><Button>Review creative <ArrowRight className="h-4 w-4" aria-hidden /></Button></Link>
            <Link href={`${ATELIER_BASE}/campaigns`}><Button variant="ghost">Open the holiday brief</Button></Link>
          </div>
        </div>
        <Link href={`${ATELIER_BASE}/performance`} className="group block">
          <ArtPlate variant={0} title={lead.name} className="aspect-[4/3] rounded-[28px]" />
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-stone">The lead story</p>
              <p className="font-serif text-2xl">{lead.name}</p>
            </div>
            <p className="font-serif text-3xl text-champagne-deep tabular">{fmtRatio(roas(lead.revenue, lead.spend))}</p>
          </div>
        </Link>
      </section>

      <Rule label={PERIOD_LABEL} />

      <Gate rows={2}>
        <section className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <Stat label="Attributed revenue" value={fmtCompactCurrency(total.revenue)} note="paid & owned, measured" />
          <Stat label="Media spend" value={fmtCompactCurrency(total.spend)} note="7 live campaigns" />
          <Stat label="Measured ROAS" value={fmtRatio(roas(total.revenue, total.spend))} note="Shopify-matched orders" />
          <Stat label="New customers" value={fmtNumber(total.newCustomers)} note="first orders" />
        </section>
      </Gate>

      <section className="mt-14 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-7">
          <div className="flex items-baseline justify-between">
            <div>
              <Eyebrow>The season so far</Eyebrow>
              <p className="mt-1 font-serif text-2xl">Daily revenue and spend</p>
            </div>
            <Pill tone="gold">Synthetic</Pill>
          </div>
          <Gate rows={4} className="mt-6">
            <div className="h-72 lg:h-[400px]">
              <ResponsiveContainer>
                <AreaChart data={daily} margin={{ left: 0, right: 8, top: 10 }}>
                  <defs>
                    <linearGradient id="atl-rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#c8a96a" stopOpacity={0.45} />
                      <stop offset="1" stopColor="#c8a96a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e6dcc8" strokeDasharray="2 6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8a8378" }} tickLine={false} axisLine={false} interval={14} />
                  <YAxis tick={{ fontSize: 11, fill: "#8a8378" }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompactCurrency(v)} width={52} />
                  <Tooltip {...atelierTooltip} formatter={(v) => fmtCurrency(Number(v))} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#9c7e45" strokeWidth={1.6} fill="url(#atl-rev)" />
                  <Area type="monotone" dataKey="spend" name="Spend" stroke="#23211e" strokeWidth={1} strokeDasharray="3 4" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Gate>
        </Card>

        <div className="space-y-6">
          <Card>
            <Eyebrow>On your desk</Eyebrow>
            <Gate rows={3} className="mt-4" emptyTitle="A clear desk" emptyBody="Nothing awaits your approval.">
              <ul className="divide-y divide-parchment">
                {pending.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <ArtPlate variant={a.art} label={false} className="h-12 w-10 shrink-0 rounded-lg" />
                      <div>
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-stone">v{a.version} · {a.owner} · {a.updated}</p>
                      </div>
                    </div>
                    <Pill tone={a.status === "Changes requested" ? "rose" : "gold"}>{a.status}</Pill>
                  </li>
                ))}
              </ul>
            </Gate>
          </Card>
          <Card className="bg-graphite text-ivory border-graphite">
            <p className="text-[11px] uppercase tracking-[0.22em] text-champagne">Counsel suggests</p>
            <p className="mt-3 font-serif text-2xl leading-snug">{rec.title}</p>
            <p className="mt-3 text-sm text-ivory/70">{rec.impact}</p>
            <div className="mt-5 flex items-center gap-3 text-xs text-ivory/60">
              <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden /> {rec.evidence.length} cited records</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden /> Needs approval</span>
            </div>
            <Link href={`${ATELIER_BASE}/counsel`} className="mt-5 inline-flex items-center gap-2 text-sm text-champagne hover:underline">Read the reasoning <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </Card>
        </div>
      </section>

      <Rule label="In the studio this season" />
      <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {campaigns.slice(0, 4).map((c, i) => (
          <Link key={c.id} href={`${ATELIER_BASE}/campaigns`} className="group">
            <ArtPlate variant={i + 1} label={false} title={c.name} className="aspect-[4/5] rounded-[22px]" />
            <div className="mt-3 flex items-center justify-between">
              <Pill tone={c.status === "Live" ? "sage" : "neutral"}>{c.status}</Pill>
              <span className="text-xs text-stone">{c.platform}</span>
            </div>
            <p className="mt-2 font-serif text-xl leading-tight group-hover:italic">{c.name}</p>
            <p className="text-xs text-stone">{c.spend ? `${fmtCompactCurrency(c.spend)} spent · ${fmtRatio(roas(c.revenue, c.spend))} measured` : `Launches ${c.start}`}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
