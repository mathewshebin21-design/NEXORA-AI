"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, api } from "@/lib/api/client";
import type { Me, Org, Workspace } from "@/lib/api/types";

type AppState = {
  me: Me;
  org: Org;
  workspaces: Workspace[];
  workspace: Workspace | null;
  can: (perm: string) => boolean;
  canWs: (perm: string) => boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
};

const LAST_WS_KEY = "nexora:last-ws";
export function rememberWorkspace(orgId: string, wsId: string) {
  try { localStorage.setItem(`${LAST_WS_KEY}:${orgId}`, wsId); } catch { /* storage unavailable */ }
}
export function lastWorkspace(orgId: string) {
  try { return localStorage.getItem(`${LAST_WS_KEY}:${orgId}`); } catch { return null; }
}

export function AppProvider({ children, loading, failed }: { children: ReactNode; loading: ReactNode; failed: (msg: string) => ReactNode }) {
  const { orgId, wsId } = useParams<{ orgId: string; wsId?: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<{ me: Me; org: Org; workspaces: Workspace[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [me, org, workspaces] = await Promise.all([
        api<Me>("/auth/me"),
        api<Org>(`/orgs/${orgId}`),
        api<Workspace[]>(`/orgs/${orgId}/workspaces`),
      ]);
      setData({ me, org, workspaces });
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      else setError(e instanceof ApiError && e.status === 404 ? "This organisation doesn’t exist or you don’t have access to it." : "Couldn’t load your workspace. Is the API running?");
    }
  }, [orgId, pathname, router]);

  useEffect(() => { load(); }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <>{failed(error)}</>;
  if (!data) return <>{loading}</>;
  const workspace = data.workspaces.find((w) => w.id === wsId) ?? null;
  const value: AppState = {
    ...data,
    workspace,
    can: (p) => data.org.permissions.includes(p),
    canWs: (p) => !!workspace?.permissions.includes(p),
    refresh: load,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
