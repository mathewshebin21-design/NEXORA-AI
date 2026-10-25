import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

const POINTS = ["Measured revenue, not platform guesses", "Every client in an isolated workspace", "AI that cites its sources and asks before acting"];

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-screen bg-midnight font-sans text-[#dfe6fb]" style={{ ["--focus-ring" as string]: "#3d7bff" }}>
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        <aside className="relative hidden overflow-hidden border-r border-slate-line/60 bg-navy p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(46,105,238,0.35),transparent_60%)]" aria-hidden />
          <Link href="/growth" className="relative flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-electric to-teal text-sm font-bold text-white">N</span>
            <span className="font-semibold text-white">Nexora <span className="font-normal text-mist">Growth Intelligence</span></span>
          </Link>
          <div className="relative">
            <p className="max-w-md text-3xl font-semibold leading-tight text-white">Know which marketing dollars actually come back.</p>
            <ul className="mt-6 space-y-2 text-sm text-mist">
              {POINTS.map((p) => <li key={p} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal" aria-hidden />{p}</li>)}
            </ul>
          </div>
          <p className="relative text-[11px] text-mist">Early-access build · no live ad-platform connections yet</p>
        </aside>
        <main className="flex items-center justify-center px-5 py-12">
          <div className="w-full max-w-sm">
            <Link href="/growth" className="mb-8 flex items-center gap-2 lg:hidden">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-electric to-teal text-[13px] font-bold text-white">N</span>
              <span className="font-semibold text-white">Nexora</span>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-mist">{subtitle}</p>}
            <div className="mt-6">{children}</div>
            {footer && <div className="mt-6 text-[12.5px] text-mist">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
