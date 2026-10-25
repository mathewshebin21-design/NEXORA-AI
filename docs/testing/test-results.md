# Test Results — Phase 1 previews

Run on 2026-10-25 against a production build (`next build && next start`) in the cloud dev container. Chromium + Playwright were pre-installed. Raw log: [`e2e-run-2026-10-25.txt`](./e2e-run-2026-10-25.txt).

| Suite | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | ✅ no errors |
| Production build | `npm run build` | ✅ 42 static pages generated |
| Analytics unit tests | `npm run test:unit` | ✅ 9 / 9 passed |
| Browser crawl + accessibility | `npm run test:e2e` | ✅ 80 / 80 checks passed |

## What the browser suite checks
- All 37 routes (hub, 3 landing pages, 33 in-app screens) at **1440 px** and **390 px** widths:
  - HTTP 200 and a `<main>` landmark
  - no uncaught page errors or console errors
  - **axe-core**: zero *critical* or *serious* violations (colour contrast included)
  - mobile: no horizontal page overflow
- Six interaction flows:
  - Atelier navigation → error state → retry
  - Atelier creative approval blocked by a failing claim check
  - Growth ⌘K palette navigation
  - Growth scenario slider changes the projection
  - Command copilot answers with citations
  - Command launch locked until every gate is cleared

## Issues found and fixed during this run
The first run passed 30 of 80. The suite surfaced, and we fixed:
- Text contrast below 4.5:1 (Atelier stone/champagne/rosewood tokens; Growth electric-blue buttons). Tokens were darkened after measuring the ratios.
- SVG buttons whose accessible name did not match their visible text; listbox/option misuse; a list with non-`li` children.
- Scrollable regions that could not be reached by keyboard; `tabIndex` and region labels added.
- Mobile horizontal overflow on Growth screens (grid children missing `min-w-0`; wide segmented controls).
- A crash on the Copilot screen: newer Chromium's `scrollIntoView` returns a Promise, which an arrow-expression `useEffect` passed back to React as its "cleanup". Effect bodies are now blocks.

## Not yet covered (planned for later phases)
API, integration, tenant-isolation, authorisation, workflow-reliability, AI-grounding, prompt-injection and performance tests. There is no back end yet, so these cannot run. Real-provider acceptance tests will be kept separate from synthetic fixtures.
