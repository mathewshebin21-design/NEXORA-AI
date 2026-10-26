# NEXORA AI

**AI marketing intelligence, campaign automation and revenue growth studio.** An evidence-first platform for agencies running multiple client workspaces.

> **Status: Phase 3 (data connectors) complete on design direction B — Growth Intelligence.**
> Working today: secure sign-up/sign-in, multi-tenant organisations with PostgreSQL row-level security, client workspaces, roles and permissions, invitations, projects, an append-only audit log, plan usage metering, workspace configuration, data export and deletion, and workspace-scoped API keys.
> Phase 3 adds read-only connectors for **Google Ads, Meta Ads, GA4 and Shopify**: OAuth with encrypted tokens, a background sync worker with retries and idempotent upserts, and a Data sources screen with row-level lineage. Without provider credentials the connectors run in clearly labelled **sample-data mode**; live mode is implemented and tested against mocked providers, but not yet against real accounts.
> Not yet built: the analytics engine over imported data (Phase 8) or any AI provider. Analytics screens show synthetic data only in the demo workspace.

## Quick start (local)

Requirements: Node.js ≥ 22, Python ≥ 3.12 with [uv](https://docs.astral.sh/uv/), PostgreSQL 16.

```bash
# 1. Database roles + schema (needs a superuser connection)
cd apps/api
PGURL=postgresql://postgres@localhost:5432 ./scripts/bootstrap_db.sh
uv sync
NEXORA_OWNER_DATABASE_URL=postgresql+psycopg://nexora_owner:nexora_owner@localhost:5432/nexora uv run alembic upgrade head

# 2. API (runtime role is RLS-restricted; embedded worker runs syncs in dev)
NEXORA_DATABASE_URL=postgresql+psycopg://nexora_app:nexora_app@localhost:5432/nexora NEXORA_EMBEDDED_WORKER=true \
  uv run uvicorn nexora.main:app --port 8000

# 3. Web (proxies /api → http://localhost:8000; override with NEXORA_API_URL)
cd ../web && npm install && npm run build && npm start
```

Or run everything with `PGURL=postgresql://postgres@localhost:5432 ./scripts/dev.sh`.

Then open **http://localhost:3000/signup** to create an agency. You'll get a demo client workspace, and you can create real ones, invite teammates and issue API keys.

| Area | URL |
|---|---|
| Product (direction B) | `/signup`, `/login`, `/app` |
| Public API (API keys) | `/api/v1/workspace`, `/api/v1/projects` · OpenAPI docs at `http://localhost:8000/docs` |
| Design concept previews | `/` (hub), `/atelier`, `/growth`, `/command` |

## Tests

```bash
cd apps/api && uv run pytest                       # 58 tests against real PostgreSQL (NEXORA_TEST_SUPERUSER_URL)
cd apps/web && npm run typecheck && npm run test:unit
# with API + web running:
node tests/product-e2e.mjs                          # 18-step product flow + axe
node tests/e2e.mjs                                  # 80 preview crawl + axe checks
```

Latest results: [docs/testing/test-results.md](docs/testing/test-results.md). CI runs all of the above: [.github/workflows/ci.yml](.github/workflows/ci.yml).

## Documentation

| Document | Contents |
|---|---|
| [Competitive research](docs/research/competitive-analysis.md) | 14 vendors, capability matrix, segment, MVP priorities, sources |
| [PRD & MVP scope](docs/product/prd-mvp.md) | Personas, principles, P0/P1/P2 scope |
| [Architecture](docs/architecture/architecture.md) | Current code map, tenancy model, target modular monolith, costs |
| [ADR-001: AI provider](docs/architecture/adr-001-ai-provider.md) | First AI provider (Anthropic Claude), models, cost estimate, guardrails |
| [Security overview](docs/security/security-overview.md) | Isolation, auth, CSRF, API keys, audit, connectors, known gaps |
| [Data connectors](docs/connectors/connectors.md) | Providers, setup, sync guarantees, lineage, limitations |
| [Design concepts](docs/design/design-concepts.md) | A/B/C comparison (B selected) |
| [Screenshots](docs/screenshots/) | `phase2-*` product screens · concept previews |

## Repository layout

```
apps/api/    FastAPI + PostgreSQL (RLS) — tenancy, auth, governance, public API
apps/web/    Next.js product (design B) + the three concept previews
docs/        research, product, architecture, security, design, testing, screenshots
scripts/     dev.sh — local bootstrap and run
```

## Honesty notes
- Every number in the product is computed by tested code. There is no LLM in the loop yet; the demo "copilot" is a deterministic router over synthetic data.
- No paid API, subscription or cloud resource has been activated. Email delivery isn't configured, so invitation links are copied and shared by the inviter.
- See the security overview for known gaps (MFA/SSO, shared rate limiting, KMS).
