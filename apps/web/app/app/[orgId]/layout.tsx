"use client";

import Link from "next/link";
import { AppProvider } from "@/components/app/AppContext";
import { AppShell } from "@/components/app/AppShell";
import { Notice, Spinner } from "@/components/app/forms";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider
      loading={<div className="grid min-h-screen place-items-center bg-midnight font-sans"><Spinner label="Loading workspace" /></div>}
      failed={(m) => (
        <div className="grid min-h-screen place-items-center bg-midnight p-6 font-sans">
          <div className="max-w-md space-y-3"><Notice tone="error">{m}</Notice><Link href="/app" className="text-sm text-electric-soft">Go to my organisations</Link></div>
        </div>
      )}
    >
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
