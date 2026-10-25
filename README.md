# NEXORA AI

**AI marketing intelligence, campaign automation and revenue growth studio** — an evidence-first platform for agencies running multiple client workspaces.

> **Status: Phase 0 + Phase 1 complete — awaiting design approval.**
> Three interactive front-end design concepts are built and tested. No back end exists yet, and no live integrations or AI providers are connected. **All data shown is synthetic** (a fictional agency, *Halcyon Growth Partners*, and its fictional client *Lumen & Oak*).

## Run the previews locally

Requires Node.js ≥ 22.

```bash
cd apps/web
npm install
npm run build && npm start      # production build on http://localhost:3000
# or: npm run dev               # hot-reload dev server
```

Open **http://localhost:3000** for the concept hub, then:

| Concept | Landing | App |
|---|---|---|
| **A — Nexora Atelier** (creative-first luxury studio) | `/atelier` | `/atelier/studio/today` |
| **B — Nexora Growth Intelligence** (executive revenue terminal) | `/growth` | `/growth/app/overview` |
| **C — Nexora Campaign Command** (AI-native ops center) | `/command` | `/command/ops/bridge` |

Each concept has 12 screens (landing + 11 in-app) plus a responsive mobile layout. Use the **Preview state** switch (Data / Loading / Empty / Error) on any in-app screen to inspect state treatments. Try ⌘K / Ctrl+K in Concept B.

### Tests

```bash
npm run typecheck
npm run test:unit                # deterministic analytics (hand-computed expected values)
npm start &                      # then, in another shell:
npm run test:e2e                 # Playwright crawl + axe-core + interaction flows
```

Latest results: [docs/testing/test-results.md](docs/testing/test-results.md) (9/9 unit, 80/80 browser checks).

## Documentation

| Document | Contents |
|---|---|
| [Competitive research](docs/research/competitive-analysis.md) | 14 vendors, capability matrix, market signals, segment, MVP priorities, sources |
| [PRD & MVP scope](docs/product/prd-mvp.md) | Personas, principles, P0/P1/P2 scope, acceptance criteria |
| [Architecture](docs/architecture/architecture.md) | Current preview structure, target modular monolith, security, cost estimates |
| [Design concepts](docs/design/design-concepts.md) | How A/B/C differ, screen coverage, strengths and weaknesses |
| [Screenshots](docs/screenshots/) | Desktop captures per concept + mobile contact sheet |

## Repository layout

```
apps/web/            Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Motion · Recharts
  app/               routes for the hub and the three concepts
  components/        atelier/ · growth/ · command/ — independent shells and screens
  lib/               metrics, attribution, stats, scenario, copilot router, synthetic data
  tests/             analytics unit tests, browser e2e
docs/                research, product, architecture, design, testing, screenshots
```

## Honesty notes
- Metrics, attribution, experiment statistics and budget scenarios are computed by tested code. The preview "copilot" is a deterministic intent router, **not** an LLM.
- Integrations marked "Demo fixture" are synthetic stand-ins; none are connected.
- Image/video generation is not integrated. Campaign imagery is generated abstract SVG art, labelled as placeholder.
- No paid API, subscription or cloud resource has been activated.
