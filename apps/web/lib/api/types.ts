export type OrgRole = "owner" | "admin" | "member";
export type WorkspaceRole = "workspace_admin" | "strategist" | "media_buyer" | "lifecycle" | "analyst" | "client_viewer";

export type User = { id: string; email: string; name: string; created_at: string };
export type Membership = { org_id: string; org_name: string; org_slug: string; role: OrgRole; deletion_requested_at: string | null };
export type Me = { user: User; memberships: Membership[] };

export type Org = { id: string; name: string; slug: string; plan: string; created_at: string; deletion_requested_at: string | null; role: OrgRole; permissions: string[] };

export type WorkspaceSettings = {
  currency: string;
  timezone: string;
  fiscal_year_start_month: number;
  default_attribution_model: "first_touch" | "last_touch" | "linear" | "time_decay" | "position_based";
  data_retention_months: number;
  brand_name: string;
};
export type Workspace = { id: string; org_id: string; name: string; slug: string; settings: Partial<WorkspaceSettings>; is_demo: boolean; created_at: string; role: WorkspaceRole | null; permissions: string[] };

export type Member = { user_id: string; email: string; name: string; role: OrgRole; joined_at: string; workspaces: { workspace_id: string; workspace_name: string; role: WorkspaceRole }[] };
export type WorkspaceMember = { user_id: string; email: string; name: string; role: WorkspaceRole; org_role: OrgRole };

export type Invitation = { id: string; email: string; org_role: string; workspace_id: string | null; workspace_role: string | null; created_at: string; expires_at: string; accepted_at: string | null; revoked_at: string | null; status: "pending" | "accepted" | "revoked" | "expired" };
export type InvitationCreated = Invitation & { accept_url: string; delivery: string };
export type InvitationLookup = { org_name: string; email: string; org_role: string; expires_at: string; status: string };

export type Project = { id: string; workspace_id: string; name: string; description: string; status: "active" | "paused" | "archived"; created_by: string | null; created_at: string; updated_at: string };

export type ApiKey = { id: string; name: string; prefix: string; scopes: string[]; created_at: string; last_used_at: string | null; expires_at: string | null; revoked_at: string | null };
export type ApiKeyCreated = ApiKey & { key: string };

export type AuditEntry = { id: number; workspace_id: string | null; actor_user_id: string | null; actor_api_key_id: string | null; actor_label: string | null; action: string; target_type: string | null; target_id: string | null; details: Record<string, unknown>; ip: string | null; created_at: string };
export type AuditPage = { items: AuditEntry[]; next_cursor: number | null };

export type Usage = { plan: string; period_start: string; period_end: string; billing_connected: boolean; metrics: { metric: string; used: number; limit: number | null }[] };
export type SessionInfo = { id: string; created_at: string; last_seen_at: string; expires_at: string; ip: string | null; user_agent: string | null; current: boolean };

export const WORKSPACE_ROLES: { id: WorkspaceRole; label: string }[] = [
  { id: "workspace_admin", label: "Workspace admin" },
  { id: "strategist", label: "Strategist" },
  { id: "media_buyer", label: "Media buyer" },
  { id: "lifecycle", label: "Lifecycle lead" },
  { id: "analyst", label: "Analyst" },
  { id: "client_viewer", label: "Client viewer" },
];
export const roleLabel = (r: string | null | undefined) => WORKSPACE_ROLES.find((x) => x.id === r)?.label ?? (r ? r[0].toUpperCase() + r.slice(1) : "—");

// ---------------------------------------------------------------- data sources (Phase 3)
export type ProviderKey = "google_ads" | "meta_ads" | "ga4" | "shopify";
export type Connector = {
  provider: ProviderKey;
  name: string;
  category: string;
  produces: "ad_daily" | "orders" | "web_daily";
  scopes: string[];
  docs_url: string;
  setup_note: string;
  config_fields: { key: string; label: string; hint: string }[];
  live_available: boolean;
  live_unavailable_reason: string | null;
  missing_settings: string[];
};
export type SyncRun = {
  id: string; connection_id: string; status: "queued" | "running" | "succeeded" | "failed"; trigger: string;
  window_start: string; window_end: string; attempt: number; max_attempts: number; records_fetched: number; records_upserted: number;
  error: string | null; created_at: string; started_at: string | null; finished_at: string | null; duration_s: number | null;
};
export type ConnectionInfo = {
  id: string; provider: ProviderKey; mode: "sample" | "live"; status: "active" | "error" | "revoked"; display_name: string;
  external_account_id: string | null; scopes: string[]; config: Record<string, string>; last_sync_at: string | null; last_error: string | null;
  created_at: string; data: { table: string; rows: number; from: string | null; to: string | null }; latest_run: SyncRun | null;
};
export type DataSummary = Record<"ad_daily" | "orders" | "web_daily", { rows: number; synthetic_rows: number; from: string | null; to: string | null }>;
export type DataPreview = { table: string; columns: string[]; rows: Record<string, string | number | boolean | null>[] };
