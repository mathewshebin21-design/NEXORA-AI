"""Connectors: connections, OAuth states, sync runs, sync queue and normalised fact tables — with RLS.

Revision ID: 0002
Revises: 0001
"""

from alembic import op

from nexora.config import get_settings

revision = "0002"
down_revision = "0001"

RLS_TABLES = ["connections", "oauth_states", "sync_runs", "fact_ad_daily", "fact_orders", "fact_web_daily"]
FACT_LINEAGE = """
  org_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  connection_id uuid NOT NULL,
  sync_run_id uuid NOT NULL,
  is_synthetic boolean NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, connection_id) REFERENCES connections(org_id, id) ON DELETE CASCADE,
"""


def upgrade() -> None:
    app_role = get_settings().app_db_role
    op.execute(
        f"""
        CREATE TABLE connections (
          id uuid PRIMARY KEY,
          org_id uuid NOT NULL,
          workspace_id uuid NOT NULL,
          provider varchar(32) NOT NULL CHECK (provider IN ('google_ads','meta_ads','ga4','shopify')),
          mode varchar(16) NOT NULL CHECK (mode IN ('sample','live')),
          status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','error','revoked')),
          display_name varchar(160) NOT NULL,
          external_account_id varchar(128),
          scopes varchar[] NOT NULL DEFAULT '{{}}',
          credentials bytea,                       -- Fernet-encrypted JSON; live connections only
          config jsonb NOT NULL DEFAULT '{{}}'::jsonb,
          last_sync_at timestamptz,
          last_error text,
          created_by uuid REFERENCES users(id) ON DELETE SET NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          revoked_at timestamptz,
          UNIQUE (org_id, id),
          FOREIGN KEY (org_id, workspace_id) REFERENCES workspaces(org_id, id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX connections_one_active_per_provider ON connections(workspace_id, provider) WHERE revoked_at IS NULL;

        CREATE TABLE oauth_states (
          state_hash varchar(64) PRIMARY KEY,
          org_id uuid NOT NULL,
          workspace_id uuid NOT NULL,
          provider varchar(32) NOT NULL,
          code_verifier text NOT NULL,
          config jsonb NOT NULL DEFAULT '{{}}'::jsonb,
          created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at timestamptz NOT NULL DEFAULT now(),
          expires_at timestamptz NOT NULL,
          used_at timestamptz,
          FOREIGN KEY (org_id, workspace_id) REFERENCES workspaces(org_id, id) ON DELETE CASCADE
        );

        CREATE TABLE sync_runs (
          id uuid PRIMARY KEY,
          org_id uuid NOT NULL,
          workspace_id uuid NOT NULL,
          connection_id uuid NOT NULL,
          status varchar(16) NOT NULL CHECK (status IN ('queued','running','succeeded','failed')),
          trigger varchar(16) NOT NULL CHECK (trigger IN ('initial','manual','schedule')),
          idempotency_key varchar(200) NOT NULL,
          window_start date NOT NULL,
          window_end date NOT NULL,
          attempt integer NOT NULL DEFAULT 0,
          max_attempts integer NOT NULL DEFAULT 3,
          records_fetched integer NOT NULL DEFAULT 0,
          records_upserted integer NOT NULL DEFAULT 0,
          error text,
          requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          started_at timestamptz,
          finished_at timestamptz,
          UNIQUE (connection_id, idempotency_key),
          CHECK (window_end >= window_start),
          FOREIGN KEY (org_id, connection_id) REFERENCES connections(org_id, id) ON DELETE CASCADE
        );
        CREATE INDEX sync_runs_conn_time ON sync_runs(connection_id, created_at DESC);

        -- Work queue. Holds only routing metadata (no tenant data), so the worker can claim jobs
        -- across organisations before it knows which tenant context to apply.
        CREATE TABLE sync_queue (
          run_id uuid PRIMARY KEY REFERENCES sync_runs(id) ON DELETE CASCADE,
          org_id uuid NOT NULL,
          available_at timestamptz NOT NULL DEFAULT now(),
          locked_at timestamptz,
          locked_by varchar(64)
        );
        CREATE INDEX sync_queue_available ON sync_queue(available_at) WHERE locked_at IS NULL;

        CREATE TABLE fact_ad_daily (
          {FACT_LINEAGE}
          provider varchar(32) NOT NULL,
          account_id varchar(64) NOT NULL,
          date date NOT NULL,
          campaign_id varchar(64) NOT NULL,
          campaign_name varchar(255) NOT NULL,
          impressions bigint NOT NULL CHECK (impressions >= 0),
          clicks bigint NOT NULL CHECK (clicks >= 0),
          spend numeric(14,4) NOT NULL CHECK (spend >= 0),
          platform_conversions numeric(14,4) NOT NULL CHECK (platform_conversions >= 0),
          platform_conversion_value numeric(14,4) NOT NULL CHECK (platform_conversion_value >= 0),
          currency char(3) NOT NULL,
          PRIMARY KEY (connection_id, date, campaign_id)
        );
        CREATE INDEX fact_ad_daily_ws_date ON fact_ad_daily(workspace_id, date);

        CREATE TABLE fact_orders (
          {FACT_LINEAGE}
          order_id varchar(64) NOT NULL,
          ordered_at timestamptz NOT NULL,
          total_revenue numeric(14,4) NOT NULL CHECK (total_revenue >= 0),
          currency char(3) NOT NULL,
          customer_ref varchar(64),                -- SHA-256 of the provider customer id; never names/emails
          is_first_order boolean,                  -- NULL when the source cannot tell
          utm_source varchar(128),
          utm_medium varchar(128),
          utm_campaign varchar(255),
          financial_status varchar(32),
          PRIMARY KEY (connection_id, order_id)
        );
        CREATE INDEX fact_orders_ws_time ON fact_orders(workspace_id, ordered_at);

        CREATE TABLE fact_web_daily (
          {FACT_LINEAGE}
          date date NOT NULL,
          channel_group varchar(64) NOT NULL,
          sessions bigint NOT NULL CHECK (sessions >= 0),
          engaged_sessions bigint NOT NULL CHECK (engaged_sessions >= 0),
          key_events numeric(14,4) NOT NULL CHECK (key_events >= 0),
          purchase_revenue numeric(14,4) NOT NULL CHECK (purchase_revenue >= 0),
          PRIMARY KEY (connection_id, date, channel_group)
        );
        CREATE INDEX fact_web_daily_ws_date ON fact_web_daily(workspace_id, date);
        """
    )
    for t in RLS_TABLES:
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY; ALTER TABLE {t} FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY conn_all ON connections FOR ALL USING (org_id = app_org()) WITH CHECK (org_id = app_org());
        CREATE POLICY runs_all ON sync_runs FOR ALL USING (org_id = app_org()) WITH CHECK (org_id = app_org());
        CREATE POLICY ad_all ON fact_ad_daily FOR ALL USING (org_id = app_org()) WITH CHECK (org_id = app_org());
        CREATE POLICY orders_all ON fact_orders FOR ALL USING (org_id = app_org()) WITH CHECK (org_id = app_org());
        CREATE POLICY web_all ON fact_web_daily FOR ALL USING (org_id = app_org()) WITH CHECK (org_id = app_org());
        -- OAuth callbacks arrive before the org is known: discoverable only by exact state hash.
        CREATE POLICY oauth_select ON oauth_states FOR SELECT
          USING (org_id = app_org() OR state_hash = NULLIF(current_setting('app.oauth_state_hash', true), ''));
        CREATE POLICY oauth_write ON oauth_states FOR ALL USING (org_id = app_org()) WITH CHECK (org_id = app_org());
        """
    )
    op.execute(
        f"""
        GRANT SELECT, INSERT, UPDATE, DELETE ON connections, oauth_states, sync_runs, sync_queue,
          fact_ad_daily, fact_orders, fact_web_daily TO {app_role};
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS fact_web_daily, fact_orders, fact_ad_daily, sync_queue, sync_runs, oauth_states, connections CASCADE;")
