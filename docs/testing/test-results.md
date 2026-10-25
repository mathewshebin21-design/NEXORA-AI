# Test Results

All runs below were executed in the cloud development container on 2026-10-25 (PostgreSQL 16.15, Python 3.13, Node 22, Chromium via the pre-installed Playwright). CI (`.github/workflows/ci.yml`) runs the same suites on every push; run #2 (commit 3aa24f8) passed on GitHub Actions.

## Phase 2 — core SaaS foundation

| Suite | Command | Result |
|---|---|---|
| API lint + format | `uv run ruff check` / `ruff format --check` | ✅ clean |
| API tests (real PostgreSQL + RLS) | `uv run pytest` (apps/api) | ✅ **36 / 36 passed** |
| Python dependency audit | `uvx pip-audit -r <(uv export --no-dev)` | ✅ no known vulnerabilities |
| npm dependency audit | `npm audit --omit=dev --audit-level=high` | ✅ 0 vulnerabilities |
| Web typecheck / build | `npm run typecheck` / `npm run build` | ✅ 45 routes built |
| Product end-to-end (browser → Next.js → API → PostgreSQL) | `node tests/product-e2e.mjs` | ✅ **17 / 17 checks passed** |
| Preview crawl + axe (regression) | `node tests/e2e.mjs` | ✅ 80 / 80 checks passed |
| Analytics unit tests (regression) | `npm run test:unit` | ✅ 9 / 9 passed |

### API test coverage
- **Auth (8):** sign-up creates org, owner and demo workspace; cookie flags; Argon2id and hashed session tokens at rest; weak and duplicate passwords; generic login errors; lockout after 5 failures with audit; CSRF header and origin enforcement; per-device session revocation; security headers.
- **Tenant isolation (8):** 11 cross-org read paths and 4 write paths return 404; foreign ids can't be smuggled through one's own org path; raw SQL as the runtime role is scoped by RLS; no context returns no rows; cross-org insert is rejected by `WITH CHECK`; the runtime role has no `BYPASSRLS` and RLS is forced; the audit log is append-only even for superusers.
- **RBAC (8):** client viewers are read-only and see only assigned workspaces; analyst, workspace-admin and owner rule sets; last-owner protection; removing a member drops workspace access; invitation lifecycle (wrong email, revoked, expired, unknown token); an existing account must sign in to accept; seat and workspace plan limits.
- **Governance (12):** API keys shown once, scope enforcement, wrong-secret and revoked keys rejected; API writes audited and metered; key confined to its workspace; settings validation with an audit diff; audit cursor pagination; export has data and no secrets; org export; soft delete revokes keys; project CRUD; purge only after the grace period; real client IPs serialised (regression).

### Product e2e flow
Sign-up → demo workspace with synthetic data → create a client workspace → honest empty state on real workspaces → settings validation → project CRUD → API key shown once and used against `/v1` → invite a client viewer → the invitee creates an account through the link → sees only the assigned workspace, with the projects nav hidden and writes returning 403 → audit trail shows the flow → usage/organization/security pages → JSON export without secrets → workspace deletion revokes keys and access → sign-out, failed sign-in, sign-in → anonymous redirect → mobile overflow check. Every page also passes **axe-core** (no critical or serious violations).

### Defects found by these tests and fixed
1. A non-IP client host (`testclient`) crashed `inet` inserts. `client_ip` now validates.
2. Pending ORM writes could flush after the RLS context changed, which RLS rejected. Context switches now flush first.
3. Test fixtures used the owner role, which `FORCE ROW LEVEL SECURITY` also restricts, so the setup silently touched 0 rows. Fixtures now use a superuser connection.
4. PostgreSQL `inet` values (`IPv4Address`) broke audit/session serialisation (HTTP 500). Found by the browser e2e; fixed and covered by a regression test.
5. The org/workspace switcher buttons' accessible names didn't include their visible text (axe `label-content-name-mismatch`).

## Phase 1 — design previews
See the original run log [`e2e-run-2026-10-25.txt`](./e2e-run-2026-10-25.txt): 80/80 crawl + axe checks and 9/9 analytics unit tests. Fixes from that run (contrast, SVG button names, keyboard-scrollable regions, mobile overflow, a Promise-returning effect) are described in the Phase 1 section of git history.

## Not yet covered
Load/performance tests, real-provider integration tests (no connectors yet), AI grounding and prompt-injection evaluations (no LLM yet), and a third-party penetration test.
