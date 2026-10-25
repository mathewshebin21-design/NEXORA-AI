"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Notice, Spinner } from "@/components/app/forms";
import { ApiError, api } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";

/** Entry point: send the user to their first organisation (or to sign-in). */
export default function AppEntry() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    api<Me>("/auth/me")
      .then((me) => {
        if (me.memberships.length) router.replace(`/app/${me.memberships[0].org_id}`);
        else setMsg("You aren’t a member of any organisation yet. Ask an admin for an invitation, or create a new account.");
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace("/login?next=/app");
        else setMsg("Couldn’t reach the API. Start it with `uv run uvicorn nexora.main:app` in apps/api.");
      });
  }, [router]);
  return (
    <div className="grid min-h-screen place-items-center bg-midnight p-6 font-sans">
      {msg ? <div className="max-w-md space-y-3"><Notice tone="warn">{msg}</Notice><Link href="/login" className="text-sm text-electric-soft">Back to sign in</Link></div> : <Spinner label="Opening your workspace" />}
    </div>
  );
}
