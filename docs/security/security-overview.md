# Security Overview (Phase 2)

What is implemented and tested today, and what is deliberately not done yet.

## Tenancy and data isolation

| Control | Implementation | Verified by |
|---|---|---|
| Organisation isolation in the database | Every tenant table carries `org_id` and has PostgreSQL **row-level security** with `FORCE ROW LEVEL SECURITY`. Policies compare against `app.org_id`, set per transaction. | `test_tenant_isolation.py`: raw SQL as the runtime role sees only the current org; with no context it sees nothing; cross-org `INSERT` is rejected by `WITH CHECK` |
| Runtime role cannot bypass RLS | The API connects as `nexora_app` (`NOSUPERUSER NOBYPASSRLS`). Migrations run as `nexora_owner`. | `test_runtime_role_cannot_bypass_rls` |
| API-level isolation | Every tenant route resolves org membership → workspace access. Non-members get **404** (not 403), so ids can't be probed. | 11 cross-org read paths, 4 write paths, and foreign-id smuggling through one's own org path |
| Workspace isolation inside an org | Members see only assigned workspaces. Owners and admins see all. API keys are bound to one workspace. | `test_rbac.py`, `test_api_key_cannot_reach_other_workspace` |
| Narrow cross-tenant lookups | Invitation acceptance and API-key authentication need one lookup before the org is known. Each uses a dedicated policy that matches only the exact token hash or key prefix. | invitation and API-key tests |
| Context safety | Pending writes are flushed before any context switch, and context is re-applied at the start of every transaction. | caught by tests during development (see test-results) |

## Authentication
- Passwords: **Argon2id** (argon2-cffi defaults), transparent rehash, minimum 12 characters, common-password check, email-name check.
- Sessions: 256-bit random tokens in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production). Only the **SHA-256** of each token is stored. Sessions are revocable per device and expire after 7 days.
- Brute-force protection: rate limiting per IP and per email, plus a 15-minute lockout after 5 failures. Unknown emails take the same time to reject as known ones (dummy-hash verification). Error messages are generic.
- Invitations: single-use random tokens stored hashed, expiring after 7 days, revocable. They are bound to the invited email. An existing account must sign in to accept.

## Authorisation
- Organisation roles: `owner`, `admin`, `member`. Workspace roles: `workspace_admin`, `strategist`, `media_buyer`, `lifecycle`, `analyst`, `client_viewer`. The permission matrix lives in `apps/api/nexora/permissions.py` and is enforced **server-side** on every route.
- Owner safeguards: only owners can grant or revoke the owner role, the last owner cannot be demoted or removed, and only owners can request organisation deletion or export the whole organisation.

## CSRF and transport
- Cookie-authenticated writes require the `X-Nexora-CSRF: 1` header. Browsers can't send that header cross-site, because the API grants no CORS. When an `Origin` header is present it must be in `NEXORA_ALLOWED_ORIGINS`. Bearer (API-key) requests are exempt because they carry no ambient credentials.
- The browser reaches the API only through the same-origin Next.js `/api` proxy, so the session cookie stays first-party.
- Response headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and `Cache-Control: no-store` on API responses.

## API credentials
- Format `nxk_<12-hex prefix>_<256-bit secret>`. The full key is shown **once**; only the SHA-256 hash is stored, and comparison is constant-time.
- Keys are workspace-scoped, use explicit scopes (`workspace:read`, `projects:read`, `projects:write`, `audit:read`), expire by default (90 days) and are revocable. All are revoked automatically when their workspace is deleted.
- Usage is metered per request against the plan's monthly limit (`429` when exceeded). Writes are audited with the key as the actor.

## Audit trail
- `audit_logs` is append-only. The runtime role is granted only `SELECT, INSERT`, and a trigger blocks `UPDATE`/`DELETE` even for superusers. The only exception is an explicit maintenance flag used by the purge job.
- Recorded events: sign-up, login, failed logins (with lockout flag), org changes, membership and role changes, invitations, workspace create/update (with before/after diff)/delete, workspace membership, projects, API keys, exports, deletion requests.

## Data export and deletion
- Workspace export (JSON) and organisation export (owner only). Neither includes password hashes, token hashes or API-key hashes (asserted in tests).
- Workspace deletion: confirmation by name, soft delete, keys revoked immediately.
- Organisation deletion: confirmation by slug, 30-day grace period, cancellable. `python -m nexora.purge` hard-deletes afterwards (tested).

## Known gaps (planned)
- No MFA, SSO (SAML/OIDC) or email verification yet. Email delivery isn't configured, so invitation links are shared manually.
- The rate limiter is in-process. A multi-instance deployment needs a shared store.
- The `users` and `sessions` tables are global (no RLS). They are only queried by id, token hash or email.
- No automated secret rotation and no KMS envelope encryption yet. These matter once OAuth tokens for ad platforms are stored (Phase 3).
- No penetration test has been performed.
