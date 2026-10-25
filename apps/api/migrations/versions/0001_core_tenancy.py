"""Core tenancy: users, sessions, organizations, workspaces, memberships, invitations,
projects, API keys, audit log and usage events — with row-level security.

Revision ID: 0001
Revises:
"""

from alembic import op

from nexora.config import get_settings

revision = "0001"
down_revision = None

TENANT_TABLES = ["org_memberships", "workspaces", "workspace_memberships", "invitations", "projects", "api_keys", "audit_logs", "usage_events"]


def upgrade() -> None:
    app_role = get_settings().app_db_role
    op.execute(
        """
        CREATE FUNCTION app_org() RETURNS uuid LANGUAGE sql STABLE AS
          $$ SELECT NULLIF(current_setting('app.org_id', true), '')::uuid $$;
        CREATE FUNCTION app_user() RETURNS uuid LANGUAGE sql STABLE AS
          $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;

        CREATE TABLE users (
          id uuid PRIMARY KEY,
          email varchar(320) NOT NULL,
          name varchar(120) NOT NULL,
          password_hash text NOT NULL,
          is_active boolean NOT NULL DEFAULT true,
          failed_logins integer NOT NULL DEFAULT 0,
          locked_until timestamptz,
          email_verified_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE UNIQUE INDEX users_email_lower ON users (lower(email));

        CREATE TABLE sessions (
          id uuid PRIMARY KEY,
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash varchar(64) NOT NULL UNIQUE,
          created_at timestamptz NOT NULL DEFAULT now(),
          last_seen_at timestamptz NOT NULL DEFAULT now(),
          expires_at timestamptz NOT NULL,
          revoked_at timestamptz,
          ip inet,
          user_agent varchar(400)
        );
        CREATE INDEX sessions_user ON sessions(user_id);

        CREATE TABLE organizations (
          id uuid PRIMARY KEY,
          name varchar(120) NOT NULL,
          slug varchar(64) NOT NULL UNIQUE,
          plan varchar(32) NOT NULL DEFAULT 'trial',
          created_at timestamptz NOT NULL DEFAULT now(),
          deletion_requested_at timestamptz,
          deletion_requested_by uuid
        );

        CREATE TABLE org_memberships (
          id uuid PRIMARY KEY,
          org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role varchar(16) NOT NULL CHECK (role IN ('owner','admin','member')),
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (org_id, user_id)
        );
        CREATE INDEX org_memberships_user ON org_memberships(user_id);

        CREATE TABLE workspaces (
          id uuid PRIMARY KEY,
          org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name varchar(120) NOT NULL,
          slug varchar(64) NOT NULL,
          settings jsonb NOT NULL DEFAULT '{}'::jsonb,
          is_demo boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz,
          UNIQUE (org_id, slug),
          UNIQUE (org_id, id)
        );

        CREATE TABLE workspace_memberships (
          id uuid PRIMARY KEY,
          org_id uuid NOT NULL,
          workspace_id uuid NOT NULL,
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role varchar(24) NOT NULL CHECK (role IN ('workspace_admin','strategist','media_buyer','lifecycle','analyst','client_viewer')),
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (workspace_id, user_id),
          FOREIGN KEY (org_id, workspace_id) REFERENCES workspaces(org_id, id) ON DELETE CASCADE
        );

        CREATE TABLE invitations (
          id uuid PRIMARY KEY,
          org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          email varchar(320) NOT NULL,
          org_role varchar(16) NOT NULL CHECK (org_role IN ('admin','member')),
          workspace_id uuid,
          workspace_role varchar(24),
          token_hash varchar(64) NOT NULL UNIQUE,
          invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          expires_at timestamptz NOT NULL,
          accepted_at timestamptz,
          revoked_at timestamptz,
          FOREIGN KEY (org_id, workspace_id) REFERENCES workspaces(org_id, id) ON DELETE CASCADE,
          CHECK ((workspace_id IS NULL) = (workspace_role IS NULL))
        );

        CREATE TABLE projects (
          id uuid PRIMARY KEY,
          org_id uuid NOT NULL,
          workspace_id uuid NOT NULL,
          name varchar(160) NOT NULL,
          description text NOT NULL DEFAULT '',
          status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
          created_by uuid REFERENCES users(id) ON DELETE SET NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          FOREIGN KEY (org_id, workspace_id) REFERENCES workspaces(org_id, id) ON DELETE CASCADE
        );
        CREATE INDEX projects_ws ON projects(workspace_id);

        CREATE TABLE api_keys (
          id uuid PRIMARY KEY,
          org_id uuid NOT NULL,
          workspace_id uuid NOT NULL,
          name varchar(120) NOT NULL,
          prefix varchar(16) NOT NULL UNIQUE,
          key_hash varchar(64) NOT NULL,
          scopes varchar[] NOT NULL DEFAULT '{}',
          created_by uuid REFERENCES users(id) ON DELETE SET NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          last_used_at timestamptz,
          expires_at timestamptz,
          revoked_at timestamptz,
          FOREIGN KEY (org_id, workspace_id) REFERENCES workspaces(org_id, id) ON DELETE CASCADE
        );

        CREATE TABLE audit_logs (
          id bigserial PRIMARY KEY,
          org_id uuid NOT NULL,
          workspace_id uuid,
          actor_user_id uuid,
          actor_api_key_id uuid,
          action varchar(64) NOT NULL,
          target_type varchar(32),
          target_id varchar(64),
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          ip inet,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX audit_logs_org_time ON audit_logs(org_id, created_at DESC, id DESC);

        CREATE TABLE usage_events (
          id bigserial PRIMARY KEY,
          org_id uuid NOT NULL,
          workspace_id uuid,
          metric varchar(32) NOT NULL,
          quantity bigint NOT NULL DEFAULT 1,
          occurred_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX usage_events_org_metric_time ON usage_events(org_id, metric, occurred_at);

        -- Audit log is append-only. Purges require an explicit maintenance flag set by the owner role.
        CREATE FUNCTION audit_logs_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF current_setting('app.allow_audit_purge', true) = 'on' AND TG_OP = 'DELETE' THEN
            RETURN OLD;
          END IF;
          RAISE EXCEPTION 'audit_logs is append-only';
        END $$;
        CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
          FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();
        """
    )

    # ------------------------------------------------------------ RLS
    op.execute(
        """
        ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
        CREATE POLICY org_visible ON organizations FOR SELECT
          USING (id = app_org() OR id IN (SELECT org_id FROM org_memberships WHERE user_id = app_user()));
        CREATE POLICY org_insert ON organizations FOR INSERT WITH CHECK (id = app_org());
        CREATE POLICY org_update ON organizations FOR UPDATE USING (id = app_org()) WITH CHECK (id = app_org());
        CREATE POLICY org_delete ON organizations FOR DELETE USING (id = app_org());
        """
    )
    for t in TENANT_TABLES:
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY; ALTER TABLE {t} FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        -- A user may list their own memberships across orgs (to pick an org); everything else is org-scoped.
        CREATE POLICY m_select ON org_memberships FOR SELECT USING (org_id = app_org() OR user_id = app_user());
        CREATE POLICY m_write ON org_memberships FOR ALL USING (org_id = app_org()) WITH CHECK (org_id = app_org());

        CREATE POLICY wm_select ON workspace_memberships FOR SELECT USING (org_id = app_org() OR user_id = app_user());
        CREATE POLICY wm_write ON workspace_memberships FOR ALL USING (org_id = app_org()) WITH CHECK (org_id = app_org());

        -- Invitations are discoverable only by their token hash (accept flow) or within the org.
        CREATE POLICY inv_select ON invitations FOR SELECT
          USING (org_id = app_org() OR token_hash = NULLIF(current_setting('app.invite_token_hash', true), ''));
        CREATE POLICY inv_write ON invitations FOR ALL USING (org_id = app_org()) WITH CHECK (org_id = app_org());

        -- API keys are discoverable by prefix (authentication) or within the org.
        CREATE POLICY key_select ON api_keys FOR SELECT
          USING (org_id = app_org() OR prefix = NULLIF(current_setting('app.api_key_prefix', true), ''));
        CREATE POLICY key_write ON api_keys FOR ALL USING (org_id = app_org()) WITH CHECK (org_id = app_org());

        CREATE POLICY ws_all ON workspaces FOR ALL USING (org_id = app_org()) WITH CHECK (org_id = app_org());
        CREATE POLICY proj_all ON projects FOR ALL USING (org_id = app_org()) WITH CHECK (org_id = app_org());
        CREATE POLICY audit_select ON audit_logs FOR SELECT USING (org_id = app_org());
        CREATE POLICY audit_insert ON audit_logs FOR INSERT WITH CHECK (org_id = app_org());
        CREATE POLICY audit_purge ON audit_logs FOR DELETE USING (org_id = app_org());
        CREATE POLICY usage_all ON usage_events FOR ALL USING (org_id = app_org()) WITH CHECK (org_id = app_org());
        """
    )

    # ------------------------------------------------------------ grants
    op.execute(
        f"""
        GRANT USAGE ON SCHEMA public TO {app_role};
        GRANT SELECT, INSERT, UPDATE, DELETE ON users, sessions, organizations, org_memberships, workspaces,
          workspace_memberships, invitations, projects, api_keys, usage_events TO {app_role};
        GRANT SELECT, INSERT ON audit_logs TO {app_role};
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO {app_role};
        GRANT EXECUTE ON FUNCTION app_org(), app_user() TO {app_role};
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS usage_events, audit_logs, api_keys, projects, invitations, workspace_memberships,
          workspaces, org_memberships, organizations, sessions, users CASCADE;
        DROP FUNCTION IF EXISTS audit_logs_immutable(), app_org(), app_user();
        """
    )
