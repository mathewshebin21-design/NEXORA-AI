"""Hard-delete organisations whose deletion grace period has elapsed.

Runs as a maintenance role that bypasses RLS (a superuser or a dedicated BYPASSRLS role),
never as the runtime role. Usage:

    python -m nexora.purge --url postgresql://postgres@localhost:5433/nexora [--dry-run]
"""

import argparse

import psycopg

from .config import get_settings


def purge(url: str, grace_days: int, dry_run: bool = False) -> list[str]:
    with psycopg.connect(url) as conn:
        rows = conn.execute(
            "SELECT id::text FROM organizations WHERE deletion_requested_at < now() - make_interval(days => %s)", (grace_days,)
        ).fetchall()
        ids = [r[0] for r in rows]
        if dry_run or not ids:
            return ids
        conn.execute("SELECT set_config('app.allow_audit_purge', 'on', true)")
        for oid in ids:
            conn.execute("DELETE FROM audit_logs WHERE org_id = %s", (oid,))
            conn.execute("DELETE FROM usage_events WHERE org_id = %s", (oid,))
            conn.execute("DELETE FROM organizations WHERE id = %s", (oid,))  # cascades to workspaces, members, projects, keys
        conn.commit()
        return ids


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    done = purge(a.url, get_settings().deletion_grace_days, a.dry_run)
    print(("would purge" if a.dry_run else "purged"), len(done), "organisation(s)")
