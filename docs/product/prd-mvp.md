# NEXORA AI — Product Requirements & MVP Scope

*Status: draft for design-approval gate (Phase 1). Scope is a proposal; it will be refined after a design direction is chosen.*

## 1. Problem

Agencies running paid and lifecycle marketing for several e-commerce clients keep getting the same question: *"What did our marketing actually return?"* Answering it means pulling data from ad platforms (which report their own conversions), analytics, commerce and email tools, then reconciling it by hand in spreadsheets and slides. AI writing tools speed up content but add risk: unsupported claims, invented numbers and no audit trail.

## 2. Target users (initial segment)

| Persona | Role | Primary job |
|---|---|---|
| Agency owner / Head of Growth | Owner | Profitability per client, renewals, approving spend changes |
| Strategist | Strategist | Research, briefs, creative direction, client narrative |
| Media buyer | Media buyer | Budget pacing, channel efficiency, reallocations |
| Lifecycle lead | Lifecycle | Segments, journeys, email/SMS performance |
| Analyst | Analyst | Attribution, experiments, report preparation |
| Client stakeholder | Client viewer | Reads approved reports and evidence; no edit rights |

Initial customer: 5–50 person agencies serving DTC/e-commerce brands (see research report §5).

## 3. Product principles (non-negotiable)

1. **Numbers come from code, not models.** Every metric is a tested, versioned formula over sourced inputs.
2. **Evidence is labelled.** Each claim is marked evidence, assumption or recommendation, and cites the record it rests on.
3. **Measured and reported stay apart.** Platform-reported conversions are shown next to independently measured ones, never added together.
4. **People approve outbound actions.** Spend, sends and publishing need explicit approval by an authorised role.
5. **Client data stays isolated.** Workspaces are separated at the database layer, not only in the UI.
6. **No fabricated marketing.** No invented testimonials, endorsements or superlatives without a source on file.

## 4. MVP scope

### P0 — must ship

| Area | Requirement | Acceptance criteria |
|---|---|---|
| Tenancy & auth | Organisations → client workspaces → projects; email + OAuth sign-in; roles Owner/Strategist/Media buyer/Analyst/Client viewer | Tenant-isolation tests: no cross-workspace read or write through API or SQL; role matrix enforced server-side |
| Connectors (read-only) | Google Ads, Meta Ads, GA4, Shopify | OAuth with minimum scopes; incremental sync; sync status and error states visible; synthetic fixtures kept separate from real-provider acceptance tests |
| Metric engine | CTR, CPC, CPM, CVR, CPA, CAC, ROAS, revenue, gross margin, profit, LTV, retention | Unit tests with independently computed expected values; zero-denominator → null; lineage (formula + source fields) exposed per metric |
| Reconciliation | Platform-reported vs measured conversions per campaign | Gap % shown; planning views default to measured |
| Attribution | First, last, linear, time-decay, position-based over measured paths | Every model reconciles to measured totals (no double counting); coverage and limitations shown; no incrementality claims |
| Campaign briefs | Objective, audience, messaging hierarchy, channel mix, KPIs, launch checklist | Budget arithmetic is deterministic, with assumptions listed; approval request flow |
| Creative review | Assets with versions, brand-voice profile, approved-claims sheet, claims scanner, approval workflow | Approval blocked while a claim check fails; full version history |
| Copilot (read-only) | Q&A over workspace data via validated tools | Answers cite records; separate analysis/recommendation/uncertainty; refuses when data is absent; prompt-injection test suite |
| Reports | Campaign performance, ROI, channel comparison, exec brief → PDF/CSV | Provenance block on every export; client-viewer sees approved reports only |
| Governance | Audit log, API keys (hashed), data export, deletion requests | Immutable audit entries for auth, data, AI and approval events |

### P1 — fast follow
Klaviyo + HubSpot adapters · Search Console research workspace · experiment readouts (z-test, CI, sample size) · budget scenario modelling with uncertainty bands · journey builder (draft and dry-run only) · usage metering for plans.

### P2 — later
Outbound automation (publishing and sends through connected platforms, with approvals, idempotency and rate limits) · MMM integration (e.g. Google Meridian) · geo-lift experiments · image/video generation through authorised providers · Salesforce adapter · white-label custom domains.

### Out of scope for MVP
Building our own ad-serving or ESP · look-alike audience export · any inference of sensitive attributes · guaranteed-outcome forecasting.

## 5. Success metrics (for pilot agencies)
- Time to produce a monthly client report: target −50% versus baseline (to be measured in pilots).
- Share of report figures with full provenance: 100%.
- Copilot answers containing an uncited number: 0 in the evaluation suite.
- Pilot retention after 90 days; agency-reported trust in figures (survey).

## 6. Open questions for the user
1. Which design direction (A, B or C) should anchor the product?
2. Confirm the initial segment (DTC agencies) or switch to B2B teams.
3. Preferred LLM provider for the first adapter (the abstraction stays provider-agnostic). No paid API is activated without approval.
4. Hosting preference for the first deployment (cost estimates are in the architecture doc).
