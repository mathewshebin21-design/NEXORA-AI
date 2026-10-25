# Phase 0 — Competitive Research & Market Positioning

*Prepared October 2026. Pricing figures come from vendor pages and third-party pricing guides found by web search; many disagree with each other. Treat every price as indicative and verify on the vendor's own page before using it in a commercial decision. Where sources conflict, the conflict is stated rather than resolved by guesswork.*

## 1. Executive summary

- **The market is crowded at both ends.** Enterprise suites (Salesforce, Adobe, Braze) sell agentic AI as a premium layer on top of contracts that run to tens or hundreds of thousands of dollars a year. Point tools (Jasper, Copy.ai, Semrush, Ahrefs, Hootsuite, Sprout) each own one slice of the workflow.
- **Every major vendor now markets "AI agents"**: HubSpot Breeze agents, Salesforce Agentforce Marketing, Adobe's Agent Orchestrator, Braze's Decisioning Studio and Agent Console, Sprout's Trellis, Hootsuite's OwlyGPT. "Has AI" no longer sets a product apart.
- **What is still missing for agencies** is an independent layer that (a) reconciles platform-reported results with first-party measured outcomes, (b) carries evidence and calculation provenance through to the client report, and (c) runs many isolated client workspaces with approval gates on anything that spends, sends or publishes.
- **Recommended initial segment:** small and midsize performance and lifecycle agencies (5–50 staff) serving e-commerce/DTC brands. Section 5 gives the reasons.
- **Positioning hypothesis (not yet validated):** "The evidence-first growth studio for agencies — measured revenue, transparent attribution and governed AI across every client." This is a hypothesis to test with customer interviews, not a claim that Nexora is better than anyone.

## 2. Vendor landscape

| Vendor | Core strength | Notable 2025–26 AI capability | Indicative pricing (see caveats) |
|---|---|---|---|
| **HubSpot Marketing Hub** | SMB/mid-market CRM + marketing automation | Breeze agents (Customer, Prospecting, Content, Data); credit-based metering, outcome pricing for some agents from Apr 2026 | Starter ≈ $15–20/seat/mo; Professional ≈ $800/mo (3 seats) + ~$3k onboarding; Enterprise ≈ $3,600/mo + ~$7k onboarding. AI uses HubSpot Credits (~$10 per 1,000 credits) |
| **Salesforce Marketing Cloud / Agentforce Marketing** | Enterprise cross-channel journeys on the Salesforce data platform | Agentforce Marketing bundles (Engagement+, Intelligence+, Personalisation+) | US list ≈ $1,250–$15,000 per org/month by bundle; regional variation; Premier support ≈ 30% of net licence |
| **Adobe Experience Cloud** | Enterprise content supply chain, journeys, analytics | Experience Platform Agent Orchestrator, ~10 prebuilt agents (journey, experimentation, etc.), GenStudio for Performance Marketing; AEM brand-governance agents (Summit 2026) | Quote-only enterprise |
| **Klaviyo** | E-commerce email/SMS with owned customer data | K:AI features (e.g. subject lines); predictive analytics | Free ≤ 250 profiles; Email from ≈ $20/mo; SMS credit-metered (~$0.009/US SMS cited); billing on active profiles (rules disputed across sources) |
| **Braze** | Enterprise mobile/cross-channel engagement | BrazeAI Decisioning Studio (ex-OfferFit), Agent Console, credit-based consumption | Quote-only; third-party estimates ≈ $40k–$100k/yr mid-market; Decisioning Studio ≈ $250k–$300k per use case (CFO remarks, Jan 2026) |
| **Semrush** | SEO/competitive intelligence | AI Visibility toolkit; "Semrush One" bundles | Pro ≈ $140/mo, Guru ≈ $250/mo, Business ≈ $500/mo; Semrush One ≈ $199–$549/mo; AI Visibility ≈ $99/mo/domain standalone |
| **Ahrefs** | Backlink/SEO data | Brand Radar (AI-search mention tracking) as an add-on | Lite ≈ $129/mo, Standard ≈ $249/mo, Advanced ≈ $449/mo (one source says $499), Enterprise ≈ $1,499/mo; Brand Radar price not found |
| **Jasper** | Brand-voice marketing copy | Jasper Agents, AI App Builder (Business tier) | Pro ≈ $59–69/seat/mo; Business custom (one estimate ≈ $900/mo, unverified) |
| **Copy.ai** | Repositioned as a GTM workflow platform (acquired by Fullcast per one review) | Workflow/agent credits | Chat ≈ $29/mo; workflow tiers conflict across sources ($249 → $3,000/mo) |
| **Hootsuite** | Social scheduling breadth | OwlyGPT in-workflow assistant (Mar 2026), Gemini-based image generation | Per-seat; sources range $99–$399+/user/mo |
| **Sprout Social** | Social analytics depth | Trellis AI agent (GA), social intelligence platform | Per-seat; sources range $79–$199+/seat/mo (conflicting) |
| **Google Analytics 4** | Free web/app analytics | Data-driven attribution is the default; most rule-based models were retired in Nov 2023 (last-click remains) | Free; GA4 360 is enterprise (price not confirmed in this research) |
| **Google Ads** | Search/PMax inventory | AI Max for Search (a feature layer, not a campaign type), PMax reporting upgrades, Meridian open-source MMM + GeoX geo-experiments (GML 2026) | Media spend only |
| **Meta Ads Manager** | Social inventory | Advantage+ automation, generative creative; AI-content disclosure rules from Mar 2026 | Media spend only. Vendor-reported lift claims (e.g. +15.7% conversions from the Generative Recommender) are not independently verified |

### Capability coverage (qualitative)

Key: ● strong / native, ◐ partial or add-on, ○ absent or out of scope. These ratings come from public positioning, not hands-on testing.

| Capability | HubSpot | Salesforce | Adobe | Klaviyo | Braze | Semrush/Ahrefs | Jasper/Copy.ai | Hootsuite/Sprout | GA4 | Ads platforms |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 Campaign planning | ◐ | ● | ● | ◐ | ◐ | ○ | ◐ | ◐ | ○ | ◐ |
| 2 Market/competitor intel | ○ | ◐ | ◐ | ○ | ○ | ● | ○ | ◐ | ○ | ○ |
| 3 Segmentation | ● | ● | ● | ● | ● | ○ | ○ | ○ | ◐ | ◐ |
| 4 AI creative workflows | ◐ | ◐ | ● | ◐ | ◐ | ◐ | ● | ◐ | ○ | ● |
| 5 Multichannel orchestration | ● | ● | ● | ◐ | ● | ○ | ○ | ◐ | ○ | ○ |
| 6 Lifecycle automation | ● | ● | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| 7 Attribution | ◐ | ◐ | ● | ◐ | ◐ | ○ | ○ | ○ | ● | ◐ (self-reported) |
| 8 Performance analytics | ◐ | ● | ● | ◐ | ◐ | ◐ | ○ | ● (social) | ● | ● (own platform) |
| 9 CRO | ◐ | ◐ | ● | ○ | ◐ | ○ | ○ | ○ | ◐ | ○ |
| 10 Revenue forecasting | ◐ | ◐ | ◐ | ◐ | ◐ | ○ | ○ | ○ | ◐ | ◐ |
| 11 Experimentation | ◐ | ◐ | ● | ◐ | ● | ○ | ○ | ○ | ○ | ◐ |
| 12 AI recommendations | ● | ● | ● | ◐ | ● | ◐ | ◐ | ● | ◐ | ● |
| 13 Exec reporting | ◐ | ● | ● | ◐ | ◐ | ◐ | ○ | ● | ◐ | ◐ |
| 14 Integrations | ● | ● | ● | ● | ● | ◐ | ◐ | ● | ● | ◐ |
| 15 Governance/security | ● | ● | ● | ◐ | ● | ◐ | ◐ | ◐ | ◐ | ◐ |

## 3. Observed market signals

- **Agencies are asked to prove revenue.** AgencyAnalytics' 2026 benchmark (494 agencies) reports that 55% say clients most often ask "Can you connect marketing performance to revenue?", and 48% name tracking AI-driven discovery as their hardest attribution problem. *(Vendor-run survey.)*
- **Delivery trust drives churn.** A 400+ respondent brand/agency survey reported on Swydo's blog found delivery dissatisfaction cited by 48% of clients who ended agency relationships. CallRail's outlook (n=100) reports 57% of agencies now see 12–24 month client lifespans. *(Small samples, vendor sources.)*
- **AI already saves agencies time, mostly on reporting.** AgencyAnalytics reports 79% of agencies save 5+ hours a week with AI, with reporting and summaries the top use (42%).
- **Platforms grade their own homework.** Meta and Google keep expanding automation (Advantage+, PMax, AI Max) while their reporting stays platform-centric. Google is pushing open measurement (Meridian MMM, GeoX). Platform-reported and independently measured conversions can diverge widely, a gap our synthetic demo makes visible.
- **Pricing is moving to credits and outcomes** (HubSpot Credits, Braze Flexible Credits, Copy.ai workflow credits). Buyers find AI cost hard to predict.

## 4. Underserved needs and differentiation opportunities

1. **Measured vs reported reconciliation as a first-class view.** Platform conversions next to matched first-party orders, never summed. Suites rarely put this up front, and ad platforms have no incentive to.
2. **Provenance all the way to the client PDF.** Every number in a report carries its source fields, formula and generation time. This answers the "connect marketing to revenue" question in a form a client can check.
3. **Evidence labelling in AI output.** Research and recommendations tagged as *evidence*, *assumption* or *recommendation*, with citations to records. No fabricated search volumes, competitor spend or testimonials.
4. **Agency-native multi-tenancy.** Many client workspaces, client-viewer seats, white-label reports and strict data isolation, at a price SMB agencies can afford. Today agencies stitch this together from several tools.
5. **Governed automation.** Approval gates, idempotent jobs and audit trails for anything outbound. AI drafts and people decide.
6. **Claims verification in creative review.** Copy is checked against an approved-claims sheet before approval. Meta's 2026 AI-disclosure rules raise the stakes on what ads may claim.

## 5. Recommended initial segment

**Small and midsize performance/lifecycle agencies (5–50 staff) serving DTC/e-commerce brands.**

- **Clear data spine:** commerce platforms (Shopify) supply ground-truth orders, which makes measured-vs-reported reconciliation tractable in an MVP. B2B pipeline attribution needs CRM opportunity data and longer windows.
- **Repeatable pain:** monthly client reporting, budget reallocation and creative approvals recur across every client.
- **Budget fit:** enterprise suites are out of reach. Agencies already pay for several point tools and could consolidate.
- **Expansion path:** the brands themselves (in-house teams), then B2B teams once CRM adapters mature.

*Validate with 10–15 agency interviews before committing pricing (see `docs/product/prd-mvp.md`).*

## 6. MVP priorities (summary)

P0: multi-tenant workspaces and RBAC · connectors for Google Ads, Meta Ads, GA4 and Shopify (read-only) · deterministic metric engine with lineage · measured-vs-reported reconciliation · rule-based attribution (5 models) · campaign briefs with explicit-assumption budgeting · creative review with claims checks and approvals · grounded copilot (read-only tools) · client report export (PDF/CSV) · audit log.

P1: Klaviyo/HubSpot adapters · experiments readout · budget scenario modelling · journeys (draft and dry-run) · Search Console research workspace.

P2: outbound automation (publishing, sends) behind approvals · MMM integration (e.g. Meridian) · geo-lift tests · image/video generation through authorised providers.

## 7. Architecture recommendations (summary)

Modular monolith: Next.js front end and a FastAPI back end over PostgreSQL with row-level security per workspace. Background workers handle connector syncs. Metric definitions live in versioned SQL/Python and are unit-tested against independent expected values. A provider-agnostic LLM layer limits the model to selecting validated tools and phrasing answers; it never produces numbers. Details are in `docs/architecture/architecture.md`.

## Sources

- HubSpot pricing guides: [sendx.io](https://www.sendx.io/blog/hubspot-pricing), [hublead.io calculator](https://www.hublead.io/hubspot-pricing-calculator), [resonatehq.com](https://www.resonatehq.com/hubspot-pricing), [chatarmin.com](https://chatarmin.com/en/blog/hubspot-pricing)
- HubSpot Breeze agents: [eesel.ai](https://www.eesel.ai/blog/breeze-agents), [spotdev.co.uk](https://www.spotdev.co.uk/blog/hubspot-breeze-customer-agent), [insidea.com](https://insidea.com/blog/hubspot/which-hubspot-breeze-agent)
- Salesforce Agentforce Marketing pricing: [salesforce.com (US)](https://www.salesforce.com/products/marketing-pricing/), [EU](https://www.salesforce.com/eu/products/marketing-cloud/pricing/), [AU](https://www.salesforce.com/au/marketing/pricing/), [IN](https://www.salesforce.com/in/marketing/pricing/)
- Adobe agents and GenStudio: [unite.ai](https://www.unite.ai/adobe-introduces-10-purpose-built-ai-agents-for-customer-experience/), [constellationr.com](https://www.constellationr.com/insights/news/adobes-plan-leverage-agentic-ai-cx-unify-platform), [sii.pl Summit 2026](https://sii.pl/blog/en/adobe-summit-2026-agentic-ai-aem-i-nowa-era-customer-experience-orchestration/)
- Klaviyo pricing: [getkanal.com](https://getkanal.com/blog/klaviyo-pricing), [moengage.com](https://www.moengage.com/blog/klaviyo-pricing/), [spoks.com](https://spoks.com/resources/klaviyo-pricing-breakdown), [retainful.com](https://www.retainful.com/blog/klaviyo-pricing)
- Braze: [braze.com Decisioning Studio](https://braze.com/product/brazeai-decisioning-studio), [Q4 FY2026 earnings call (aol.com)](https://www.aol.com/articles/braze-brze-q4-2026-earnings-221558119.html), [marketbeat.com](https://www.marketbeat.com/instant-alerts/braze-highlights-chatgpt-sdk-agent-console-and-ai-personalization-push-at-needham-conference-2026-01-14/), [automationatlas.io](https://automationatlas.io/answers/braze-pricing-explained-2026/)
- Semrush pricing: [docket.io](https://docket.io/resources/research/semrush-pricing), [masterblogging.com](https://masterblogging.com/semrush-pricing/), [outlookindia.com](https://outlookindia.com/xhub/featured-insights/semrush-pricing-2026-plans-costs-and-which-option-is-actually-worth-it)
- Ahrefs pricing: [questiondb.io](https://questiondb.io/hub/ahrefs/), [techradar.com](https://www.techradar.com/reviews/ahrefs), [capterra.com](https://www.capterra.com/p/176340/Ahrefs/pricing/), [seo.com](https://www.seo.com/blog/ahrefs-pricing/)
- Jasper pricing: [eesel.ai](https://eesel.ai/blog/jasper-ai-pricing), [krater.ai](https://krater.ai/pricing/jasper), [layer3labs.io](https://www.layer3labs.io/guides/jasper-ai-pricing)
- Copy.ai: [copy.ai pricing blog](https://www.copy.ai/blog/copy-ai-pricing), [eesel.ai review](https://eesel.ai/blog/copy-ai-review)
- Hootsuite / Sprout Social: [hopperhq.com](https://www.hopperhq.com/blog/hootsuite-vs-sprout-social/), [sociality.io](https://sociality.io/blog/sprout-social-vs-hootsuite/), [Hootsuite OwlyGPT announcement](https://hootsuite.com/whats-new/owly-gpt-hub-strategy), [Sprout Trellis GA (cmswire.com)](https://www.cmswire.com/the-wire/now-generally-available-sprout-socials-ai-agent-trellis/)
- GA4 attribution: [measuremindsgroup.com](https://measuremindsgroup.com/google-analytics-data-driven-attribution-model), [almcorp.com (Apr 2026 changes)](https://almcorp.com/blog/ga4-attribution-model-restructure-april-2026/), [techmagnate.com](https://www.techmagnate.com/blog/google-analytics-attribution-models-guide/)
- Google Ads / Meridian: [ayko.com GML 2026](https://www.ayko.com/blog/the-biggest-campaign-announcements-from-google-marketing-live-2026), [socialsamosa.com Meridian](https://www.socialsamosa.com/news-2/google-meridian-updates-10518767), [socialmediatoday.com](https://www.socialmediatoday.com/news/google-updates-meridian-ad-campaign-performance-tracking/761521/)
- Meta Advantage+: [commonthreadco.com](https://commonthreadco.com/blogs/coachs-corner/meta-generative-recommender-q2-2026-ecommerce), [rework.com](https://resources.rework.com/tools/ai-tools/best-ai-tools-for-facebook-instagram-ads-2026), [benly.ai](https://benly.ai/learn/meta-ads/advantage-plus-updates-2026)
- Agency research: [AgencyAnalytics 2026 benchmarks](https://agencyanalytics.com/company/newsroom/press-release-agency-benchmarks-report-2026), [AgencyAnalytics attribution](https://agencyanalytics.com/blog/agency-benchmarks-2026-attribution), [Swydo client retention](https://swydo.com/blog/client-retention/), [CallRail 2026 agency outlook (PDF)](https://cdn.mediavalet.com/usva/callrail/XgWRrshJhEWNQhju4is74g/GRI6z_RpNEOURtImvC_eQA/Original/CallRail_2026%20Agency%20Marketing%20Outlook%20Report.pdf), [Improvado](https://improvado.io/blog/automated-client-reporting)

### Research limitations

- These sources are mostly secondary (pricing aggregators, affiliate reviews, vendor blogs). No vendor product was trialled hands-on for this report.
- Some figures conflict across sources. Ranges are given rather than one "true" number.
- Survey statistics come from vendors with products to sell, and sample sizes are small.
