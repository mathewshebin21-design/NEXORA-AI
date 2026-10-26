# ADR-001: First AI provider

- **Status:** Accepted (provider choice). No paid usage is active. Turning on billing needs explicit owner approval.
- **Date:** 2026-10-26
- **Decision:** The first `LLMProvider` adapter targets the **Anthropic Claude API**, through the official `anthropic` Python SDK.

## Context

Phase 4 onwards needs an LLM for four jobs:
- campaign strategy narratives;
- channel and messaging recommendations;
- copy and creative variants;
- the copilot, which answers questions by calling NEXORA's own read-only tools.

The fixed constraints:
- **Numbers never come from the model.** Budgets, forecasts and metrics come from tested, deterministic code. The model only explains them and cites them.
- **Structured, validated output.** Strategy and copy must arrive as JSON that matches a schema, so the app can store, diff and approve it.
- **Safe tool use.** The copilot may call read-only tools only. Any write needs an approval token.
- **Cost discipline.** Usage is metered per organisation and capped by plan.
- **Swappable providers.** Product code depends on the `LLMProvider` interface, never on one vendor.

## Why Anthropic first

| Need | What the Claude API provides |
|---|---|
| Grounded copilot over our own tools | Native tool use. `strict: true` tool schemas guarantee arguments match the schema. |
| Schema-valid strategy and copy | Structured outputs (`output_config.format`). Responses are validated against a JSON schema. |
| Cost control on repeated context (brand voice, workspace facts, tool definitions) | Prompt caching. Cache reads cost a fraction of normal input. |
| Bulk, non-urgent generation (copy variants, weekly summaries) | Message Batches at 50% of the normal price |
| Long client context (briefs, research, historical data) | 1M-token context window on current models |
| Per-request cost/quality tuning | `effort` setting (low → max) on a single model, so there is no need to maintain several models |
| Refusals handled without crashes | `stop_reason: "refusal"` plus a server-side fallback option |

**Alternatives considered:** OpenAI, Google Gemini, and self-hosted open models.
- OpenAI and Google Gemini have comparable tool-use and structured-output support and remain viable second adapters.
- Self-hosted open models add GPU hosting cost and operations work that do not fit the cost-discipline goal at this stage.

> **Disclosure:** this recommendation was written by Claude, an Anthropic model. The comparison above rests on documented API features, not on a benchmark we ran. Before committing to production volumes, run the Phase 10 evaluation set against a second provider.

## Model choice

The model ID is configuration, not code: `NEXORA_AI_MODEL`, with a per-feature override possible.

| Model | ID | Input $/1M tokens | Output $/1M tokens | Planned use |
|---|---|---|---|---|
| Claude Opus 5.5 | `claude-opus-5-5` | $4.00 | $20.00 | **Default.** Strategy, copilot, copy |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2.00 | $10.00 | Optional cheaper tier. Owner decision after evals |
| Claude Haiku 5.5 | `claude-haiku-5-5` | $0.10 | $0.50 | Optional for high-volume classification/tagging. Owner decision after evals |

Prices are Anthropic first-party list prices as of October 2026. Re-check them before activation.

**Default request settings:**
- adaptive thinking;
- `effort` set explicitly per feature: `medium` for strategy, `low` for copilot chat;
- streaming for long outputs;
- the refusal fallback enabled.

Downgrading to a cheaper model is a product decision for the owner, based on eval results. It is not an automatic cost cut.

## Cost estimate (assumptions, not measurements)

| Feature | Assumed tokens per call (input / output incl. thinking) | Opus 5.5 cost per call |
|---|---|---|
| Campaign strategy draft | 10,000 / 4,000 | ≈ $0.12 |
| Copilot answer (with 2–3 tool calls; cached prefix) | 12,000 / 1,500 | ≈ $0.05–0.08 |
| Copy set (10 variants) | 4,000 / 2,500 | ≈ $0.07 (≈ $0.035 via Batches) |

**Example month for one agency workspace:**
- 20 strategy drafts ≈ $2.40
- 600 copilot answers ≈ $30–48
- 100 copy sets ≈ $7

That gives **≈ $40–60 per active workspace per month**.

**Development and demo** use **mocked responses by default**, which cost $0. A small live smoke-test budget of about **$10 per month** is the suggested cap for development.

These figures are deterministic arithmetic on stated assumptions. Real costs will be measured from `usage` in the API responses and shown on the Usage screen.

## Guardrails built into the integration

1. **No key → no calls.**
   - With no `ANTHROPIC_API_KEY`, the provider is the clearly labelled mock: every output is flagged `is_mock`.
   - CI never calls the real API.
2. **Per-org monthly token and cost caps** per plan, enforced before each call, plus a hard global kill switch: `NEXORA_AI_ENABLED`.
3. **Every call is recorded** with org, workspace, feature, model, token usage and computed cost. Prompts holding client data stay in the tenant's own RLS-protected tables.
4. **Tools are read-only by default.** Write tools are not exposed to the model unless an approval token is attached.
5. **Any number in AI output must cite a metric** returned by a deterministic tool call, or it is rejected.
6. **Outbound actions are never taken by the model.** Publishing or sending stays behind explicit human approval.

## To activate (owner action, later)

1. Create an Anthropic Console account and an API key.
2. Set a **monthly spend limit** in the Console. A $10 cap is suggested for development.
3. Set `ANTHROPIC_API_KEY` and `NEXORA_AI_ENABLED=true` on the server.

Until then, all AI features run on the labelled mock provider.
