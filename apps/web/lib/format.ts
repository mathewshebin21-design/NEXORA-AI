import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const DASH = "—";

export const fmtCurrency = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? DASH
    : v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits });

export const fmtCompactCurrency = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? DASH
    : "$" + Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);

export const fmtNumber = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? DASH
    : v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const fmtCompact = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? DASH
    : Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);

export const fmtPct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || !Number.isFinite(v) ? DASH : (v * 100).toFixed(digits) + "%";

export const fmtSignedPct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || !Number.isFinite(v) ? DASH : (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(digits) + "%";

export const fmtRatio = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || !Number.isFinite(v) ? DASH : v.toFixed(digits) + "×";

export const cn = (...parts: ClassValue[]) => twMerge(clsx(parts));
