"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Preview-only switch that forces every data panel into one of the four
 * states a real data-backed screen must handle. Lets reviewers inspect
 * loading, empty and error treatments without breaking anything.
 */
export type DataState = "live" | "loading" | "empty" | "error";

type Ctx = { state: DataState; setState: (s: DataState) => void; retry: () => void };
const PreviewStateContext = createContext<Ctx>({ state: "live", setState: () => {}, retry: () => {} });

export function PreviewStateProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<DataState>("loading");

  // Simulate first fetch so the loading treatment is visible on entry.
  useEffect(() => {
    const t = setTimeout(() => setStateRaw((s) => (s === "loading" ? "live" : s)), 650);
    return () => clearTimeout(t);
  }, []);

  const setState = useCallback((s: DataState) => setStateRaw(s), []);
  const retry = useCallback(() => {
    setStateRaw("loading");
    setTimeout(() => setStateRaw("live"), 700);
  }, []);

  return <PreviewStateContext.Provider value={{ state, setState, retry }}>{children}</PreviewStateContext.Provider>;
}

export const usePreviewState = () => useContext(PreviewStateContext);

export const DATA_STATES: { id: DataState; label: string }[] = [
  { id: "live", label: "Data" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty" },
  { id: "error", label: "Error" },
];
