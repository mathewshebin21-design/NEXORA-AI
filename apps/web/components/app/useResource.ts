"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api/client";

/** Minimal fetch-with-state hook: data, error, loading and a reload function. */
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}

/** Wraps a mutation with busy/error state. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Request failed.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run, setError };
}
