/**
 * Typed client for the NEXORA API, reached through the same-origin `/api` proxy.
 * Every request sends the CSRF header the API requires for cookie-authenticated writes.
 */
export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === "string" ? detail : ApiError.flatten(detail));
  }
  static flatten(detail: unknown): string {
    if (Array.isArray(detail)) return detail.map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : String(d))).join(" ");
    if (detail && typeof detail === "object") return Object.values(detail as Record<string, unknown>).flat().join(" ");
    return "Something went wrong.";
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...rest,
    headers: { "X-Nexora-CSRF": "1", ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, data?.detail ?? res.statusText);
  return data as T;
}

/** Downloads a JSON export through the API, preserving the server-provided filename. */
export async function downloadExport(path: string) {
  const res = await fetch(`/api${path}`, { credentials: "same-origin", headers: { "X-Nexora-CSRF": "1" } });
  if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => ({})))?.detail ?? res.statusText);
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "nexora-export.json";
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
