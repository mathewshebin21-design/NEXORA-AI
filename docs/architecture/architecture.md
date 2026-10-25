# NEXORA AI — Architecture Recommendation

*Phase 0/1 recommendation. Only the front-end preview exists today. Everything below the "Preview" section is the proposed design for Phase 2 onward.*

## What exists now (Phase 1 preview)

```
apps/web/                 Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Motion · Recharts
  app/                    Routes: / (concept hub), /atelier, /growth, /command (+ 11 in-app screens each)
  components/{atelier,growth,command}/   Concept-specific shells, primitives and screens
  lib/metrics.ts          Deterministic metric formulas (null on zero denominators)
  lib/attribution.ts      5 rule-based models + reconciliation check
  lib/stats.ts            Two-proportion z-test, Wald CI, sample size
  lib/scenario.ts         Saturating response curves, marginal ROAS, uncertainty band
  lib/copilot.ts          Deterministic intent router used in place of an LLM in the preview
  lib/demo-data.ts        SYNTHETIC fixtures (fictional agency + clients)
  tests/analytics.test.ts Unit tests with hand-computed expected values
  tests/e2e.mjs           Playwright route crawl + axe-core + interaction checks
```

The analytics modules are written to be ported directly into the back end (Python) or kept as a shared TypeScript package for client-side what-if tools.

## Target architecture (Phase 2+): modular monolith

```
            ┌───────────────────────────── Next.js (Vercel or container) ─────────────────────────────┐
 Browser ──▶│ App Router UI · server actions for UI-only state · calls API with session JWT              │
            └──────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                       │ HTTPS (OpenAPI-typed client)
            ┌──────────────────────────────────────────▼──────────────────────────────────────────────┐
            │ FastAPI modular monolith                                                               │
            │  ├─ identity      orgs, workspaces, users, roles, invitations, API keys                │
            │  ├─ connectors    adapter interface · OAuth token vault · sync jobs · rate limiting     │
            │  ├─ metrics       metric definitions (SQL views + Python), lineage registry             │
            │  ├─ attribution   path builder, models, reconciliation                                  │
            │  ├─ planning      briefs, scenarios, experiments                                        │
            │  ├─ creative      assets, versions, brand voice, claims rules, approvals                │
            │  ├─ journeys      segment rules, consent, journey graphs, dry-run engine                │
            │  ├─ automation    approval-gated outbound jobs (idempotent, retried, audited)           │
            │  ├─ copilot       LLM gateway · tool registry · grounding · evals · cost metering       │
            │  ├─ reports       report specs → PDF/CSV with provenance manifest                       │
            │  └─ audit         append-only event log                                                 │
            └───────┬─────────────────────────────┬─────────────────────────────┬────────────────────┘
                    │                             │                             │
           PostgreSQL 16 (RLS)            Worker (RQ/Arq or Celery)      Object storage (S3-compatible)
           per-workspace row security     connector syncs, report         uploads, exports
                                          rendering, scheduled jobs
```

### Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Service shape | Modular monolith | One deployable and one database; module boundaries enforced by package layout and import linting. Split a module out only when scale demands it. |
| Tenant isolation | `workspace_id` on every tenant table + PostgreSQL Row-Level Security, with the session variable set per request | Defence in depth: even a buggy query cannot cross tenants. Covered by dedicated isolation tests. |
| Metric computation | SQL views for aggregation; small Python functions for derived ratios; a definitions registry (formula, inputs, version) | Deterministic, testable, explainable lineage in the UI. |
| Data shape | Raw connector tables (append-only) → normalised facts (`fact_ad_daily`, `fact_orders`, `fact_touchpoints`) → metric views | Provenance: every metric traces to raw rows and a sync run ID. |
| Attribution | Paths built from first-party touchpoints joined to orders; models are pure functions; reconciliation assertion on every run | No double counting; models are allocation rules, never causal claims. |
| AI | Provider-agnostic gateway (`LLMProvider` interface: complete, structured output, tool calls); JSON-schema-validated tool calls; models may only call read-only tools unless an approval token is attached | Swap providers; the model never computes numbers; outbound actions are impossible without approval. |
| Grounding | Retrieval over workspace documents (pgvector) + tool results; answers must cite record IDs; an evaluator rejects uncited numerals | Prevents invented performance figures. |
| Prompt-injection defence | Untrusted content (uploads, web pages, ad copy) is passed as data with provenance tags; tool allow-list per role; system policy pins actions to approval flow | Injected text cannot escalate privileges. |
| Outbound automation | Job table with idempotency keys, exponential-backoff retries, per-provider rate limits, dry-run mode, approval token, full audit | Safe, replayable, reviewable. |
| Auth | Managed auth (e.g. Auth.js/Clerk/Supabase Auth) or FastAPI-Users; short-lived JWT; optional SSO later | Avoid hand-rolled crypto. |
| Observability | Structured JSON logs (request ID, workspace ID), OpenTelemetry traces, Sentry (free tier) | Low-cost, standard. |
| CI/CD | GitHub Actions: lint, typecheck, unit, API, tenant-isolation, e2e (Playwright), axe, `npm audit` / `pip-audit` | Every check runs before merge. |

### Analytics stack
- Polars for connector normalisation and batch jobs; SQL for aggregates.
- Experiments: frequentist two-proportion tests (implemented), with Bayesian readouts optional later.
- Forecasting: deterministic baselines (seasonal naive, trailing growth) with explicit assumptions. MMM via Google's open-source Meridian is a P2 option; it needs about two years of weekly data per client.

### Security overview (planned)
- OAuth tokens encrypted at rest (envelope encryption, KMS-managed key); minimum scopes; read-only by default.
- API keys hashed (argon2); shown once.
- RBAC enforced server-side; client-viewer role limited to approved reports.
- Data export and deletion endpoints per workspace; configurable retention; consent and suppression propagated.
- Dependency audits in CI; secret scanning on the repo.

## Cost estimates (no paid service activated)

| Item | Low-cost option | Indicative monthly cost |
|---|---|---|
| Front end | Vercel Hobby (non-commercial) / Pro for commercial use | $0 / ~$20 per member |
| API + worker | Fly.io / Render / Railway small instances | ~$5–$25 |
| PostgreSQL | Neon / Supabase free tier → paid | $0 → ~$19–$25 |
| Object storage | Cloudflare R2 (free tier 10 GB) | ~$0 |
| Error monitoring | Sentry developer tier | $0 |
| LLM usage | Pay-as-you-go via chosen provider | Usage-based. Needs your approval, and a cost estimate per feature before activation |
| SEO data (optional) | Semrush/Ahrefs APIs | Requires paid plans (see research). Not planned for MVP |

*Prices are indicative and change often. Each will be confirmed before anything is provisioned.*
