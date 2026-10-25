# Phase 1 — Three Interactive Design Concepts

All three concepts run in one Next.js app (`apps/web`) and share **only** the synthetic data and the deterministic analytics modules (`lib/`). Each concept has its own shell, navigation model, URL vocabulary, primitives, typography, palette, chart styling, motion language and empty/loading/error treatments.

| | **A — Nexora Atelier** | **B — Nexora Growth Intelligence** | **C — Nexora Campaign Command** |
|---|---|---|---|
| Routes | `/atelier` · `/atelier/studio/*` | `/growth` · `/growth/app/*` | `/command` · `/command/ops/*` |
| Primary user | Strategist / creative director | Agency owner, media buyer, analyst | Ops lead coordinating agents and approvals |
| Information architecture | Editorial and story-led: Today → Research → Campaigns → Creative → … → Editions | Analyze / Plan / Activate / Admin groups; dense, filter-driven | Mission-based: Bridge, Recon, Missions, Forge, Telemetry…; agents as first-class objects |
| Navigation | Serif horizontal masthead with gold underline; full-screen numbered overlay menu on mobile | Collapsible grouped sidebar, breadcrumb, global date/channel filters, KPI ticker, ⌘K palette; bottom tab bar + "More" sheet on mobile | Glowing icon rail with tooltips; persistent **agent dock** (approvals, event stream); floating dock + agent sheet on mobile |
| Typography | Fraunces (display serif) + Manrope | Inter + JetBrains Mono numerals | Space Grotesk + JetBrains Mono |
| Palette | Ivory, graphite, champagne, sage, rosewood | Midnight navy, electric blue, teal, amber/coral signals | Near-black, violet, cyan, magenta, lime pulse |
| Signature interactions | Editorial article accordions, art-plate galleries with parallax, slide-in creative review drawer, budget sliders on a brief | Sortable/drillable tables with metric-lineage drawer, cross-filtering, scenario sliders with response curves, Sankey journey flow, kanban creative pipeline | Animated ops pipeline, radar sweep, agent trace replay, evidence graph, node-graph journey with flowing particles, animated attribution ribbons, claims "scan" |
| States | Feather empty state, ivory shimmer skeletons, rosewood error card | Dense skeleton rows, "reset filters" empty state, query-failed alert with trace ID | "Syncing telemetry" scan-line loader, "No signal" empty state, "Link lost" error with re-establish |

Each in-app screen exposes a **preview-state switch** (Data / Loading / Empty / Error) so reviewers can inspect every treatment.

## Screen coverage (13 required)

| Requirement | Atelier | Growth | Command |
|---|---|---|---|
| 1 Public landing | `/atelier` | `/growth` | `/command` |
| 2 Dashboard | Today | Overview | Bridge |
| 3 Marketing intelligence | Research | Market Intel | Recon |
| 4 Campaign planning | Campaigns | Campaign Planner | Missions |
| 5 Creative studio | Creative | Creative Ops | Forge |
| 6 Audience segmentation | Audiences | Segments | Cohorts |
| 7 Journey visualisation | Journeys (storyline) | Journeys & Funnels (funnel + Sankey) | Journey Map (node graph) |
| 8 Performance analytics | Performance | Performance | Telemetry |
| 9 Revenue attribution | Attribution | Attribution | Attribution Flow |
| 10 AI recommendations | Counsel | Insights | Copilot |
| 11 Reporting | Editions | Reports | Dispatch |
| 12 Settings & integrations | House | Settings | Systems |
| 13 Responsive mobile | Overlay menu, single-column editorial | Bottom tabs + sheet, wrapped filters | Floating dock, agent sheet |

## Strengths and weaknesses

### A — Atelier
**Strengths**
- The most distinctive brand. It reads as a premium creative studio and would stand out in agency pitches and client-facing views.
- Excellent for client-facing reports ("Editions") and creative review. The editorial layout makes provenance and assumptions easy to read.
- Calm, low-density screens. Good for strategists and client viewers.

**Weaknesses**
- Low information density. Media buyers and analysts will want more numbers per screen.
- Editorial patterns (large type, imagery) take more design effort to scale across many data-heavy features.
- Imagery depends on real campaign assets. The placeholder art plates must be replaced with the client's DAM or authorised generation.

### B — Growth Intelligence
**Strengths**
- The closest fit to the core value proposition: measured revenue, reconciliation, attribution and scenario modelling are shown densely and are easy to audit.
- Familiar SaaS patterns (sidebar, filters, ⌘K, tables), so new users learn it fastest and it is cheapest to build out.
- Scales to many features without redesign. Strongest fit for the agency-owner buyer persona.

**Weaknesses**
- Less visually differentiated from existing analytics tools (Looker-style dashboards).
- Creative and research workflows feel secondary in a terminal aesthetic.
- Density raises the bar for accessibility and mobile. The mobile view shows less at once.

### C — Campaign Command
**Strengths**
- Makes the AI-native, human-in-the-loop story tangible: agents, approval gates and audit events are visible on every screen.
- The most memorable demo, well suited to a portfolio piece and investor-style walkthroughs.
- The journey node graph and attribution flow are strong teaching visuals.

**Weaknesses**
- Highest motion and visual complexity. Costlier to build, test and keep accessible (reduced-motion paths are required).
- The sci-fi aesthetic may read as less "serious" to finance-minded buyers.
- The agent-centric IA assumes agent capabilities that need real LLM integrations (and costs) to deliver.

## Recommendation (for discussion — your choice decides)

For the stated goals (commercial credibility with agencies plus a strong portfolio), **B as the application foundation** carries the core product risk best. It could borrow two ideas from the others: the **agent dock and approval queue** from C, and the **Editions report styling** from A for client-facing exports. If portfolio impact matters most, C is the stronger showpiece. Pick A, B or C (or a named hybrid) and Phase 2 starts from that shell.
