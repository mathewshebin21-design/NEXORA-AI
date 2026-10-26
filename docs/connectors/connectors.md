# Data Connectors (Phase 3)

Four read-only connectors feed normalised fact tables, which the analytics engine (Phase 8) will read from.

| Provider | Writes to | OAuth scope | Config | API version (default) |
|---|---|---|---|---|
| Google Ads | `fact_ad_daily` (campaign × day) | `https://www.googleapis.com/auth/adwords` | Customer ID (10 digits) | `v26` — `NEXORA_GOOGLE_ADS_API_VERSION` |
| Meta Ads | `fact_ad_daily` (campaign × day) | `ads_read` | Ad account ID | `v25.0` — `NEXORA_META_API_VERSION` |
| Google Analytics 4 | `fact_web_daily` (channel group × day) | `https://www.googleapis.com/auth/analytics.readonly` | Property ID | `v1beta` — `NEXORA_GA4_API_VERSION` |
| Shopify | `fact_orders` (one row per order) | `read_orders` | Shop domain (`*.myshopify.com`) | `2026-10` — `NEXORA_SHOPIFY_API_VERSION` |

Version defaults were checked against public release notes in October 2026: Google Ads v26 released 15 Oct 2026, Meta v25.0 documented February 2026, Shopify 2026-10. **Confirm them against each provider's current version table before going live.** Every version is configurable without code changes.

## Two modes

| Mode | What happens | Rows flagged |
|---|---|---|
| **Sample data** | No credentials. A deterministic generator produces realistic rows for the sync window (same inputs → same rows). | `is_synthetic = true`, with banners in the UI |
| **Live** | OAuth with the provider. Tokens are encrypted at rest and the adapter calls the real API. | `is_synthetic = false` |

A provider shows **Connect account** only when its OAuth app is configured on the server *and* `NEXORA_ENCRYPTION_KEY` is set. Otherwise the UI explains what's missing and offers sample data.

> **Status of live mode:** the OAuth flows, request construction and response parsing are implemented and tested against **mocked providers** that use the documented response shapes. They have **not yet been exercised against real provider accounts**, because no credentials exist for this project. Treat the first live connection as an acceptance test.

## Configuration (server environment)

```bash
NEXORA_ENCRYPTION_KEY=...                 # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
NEXORA_PUBLIC_BASE_URL=https://app.example.com   # OAuth redirect: {base}/api/oauth/callback/{provider}
NEXORA_EMBEDDED_WORKER=true               # dev only; in production run `python -m nexora.worker`

# Google Ads + GA4 (one Google Cloud OAuth client, type "Web application")
NEXORA_GOOGLE_CLIENT_ID=...
NEXORA_GOOGLE_CLIENT_SECRET=...
NEXORA_GOOGLE_ADS_DEVELOPER_TOKEN=...     # from the Google Ads API Center (needs approval for production)
NEXORA_GOOGLE_ADS_LOGIN_CUSTOMER_ID=...   # optional: manager (MCC) account id

# Meta
NEXORA_META_APP_ID=...
NEXORA_META_APP_SECRET=...

# Shopify (custom/public app)
NEXORA_SHOPIFY_CLIENT_ID=...
NEXORA_SHOPIFY_CLIENT_SECRET=...
```

Registering the apps is free. Provider-side reviews are still needed before you can use live mode with client accounts: Google Ads developer-token access level, Meta app review for `ads_read` at production scale, and Shopify `read_all_orders` for history older than 60 days.

## How a sync works

1. **Request**: the initial sync after connecting, **Sync now** (7/30/90-day window), or the public API. Requests carry an `Idempotency-Key`, so repeating one returns the same run. A connection can't have two active runs (HTTP 409 returns the active one).
2. **Queue**: `sync_queue` holds only `(run_id, org_id, timing)`, no tenant data. Workers claim jobs with `FOR UPDATE SKIP LOCKED`, so several workers can run safely.
3. **Run**: the worker switches to the run's organisation (RLS context) and fetches through `ProviderHttp`:
   - timeouts and a per-client minimum request interval;
   - exponential backoff with jitter on 408/425/429/5xx, honouring `Retry-After`.
4. **Validate**: every record must parse into a strict pydantic model (non-negative amounts, ISO currency, bounded strings). One invalid record fails the run atomically.
5. **Upsert**: rows are written on natural keys (`connection+date+campaign`, `connection+order_id`, `connection+date+channel`). Re-syncing a window replaces rows and never duplicates them.
6. **Retry policy**: transient errors re-queue the run with a delay of 30 s × 2^(attempt−1), up to 3 attempts. Permanent errors (4xx, expired token, validation) fail immediately and set the connection to `error`.
7. **Audit**: `connection.created`, `connection.oauth_started`, `connection.failed`, `connection.revoked`, `sync.requested`, `sync.succeeded`, `sync.failed`.

## Data lineage and privacy

- Every fact row carries `connection_id`, `sync_run_id`, `is_synthetic` and `ingested_at`. The Data sources screen shows them next to each row.
- Platform-reported conversions (`platform_conversions`) are kept apart from commerce orders (`fact_orders`) and are never merged.
- Meta purchases count **one** action type, in the order `omni_purchase` → `purchase` → `offsite_conversion.fb_pixel_purchase`, to avoid counting the same purchase twice.
- Shopify: customer IDs are stored only as SHA-256 hashes. No names, emails or addresses are requested or stored. `is_first_order` is `NULL` for live data, because the current query can't determine it.
- Disconnecting destroys stored tokens. **Disconnect + delete data** also removes the imported rows. Deleting a workspace revokes all of its connections.

## Security controls specific to connectors

- OAuth `state`: a 256-bit random value stored only as a hash. It is single-use, expires after 10 minutes, and is bound to the initiating user and workspace. PKCE (S256) is used for Google.
- Shopify: callback HMAC verified with the app secret, plus a strict `*.myshopify.com` host check before any request (SSRF guard). The shop in the callback must match the shop requested.
- Tokens are encrypted at rest with Fernet (`NEXORA_ENCRYPTION_KEY`) and never returned by the API. Provider error excerpts are truncated and never include request headers.

## Known limitations / next steps

- Schedules: syncs are on demand (plus the initial one). A daily scheduled trigger is a small follow-up (cron → `enqueue(trigger="schedule")`).
- Google token refresh happens per run. Meta long-lived tokens (~60 days) need reconnection when they expire, and the UI shows a "reconnect" error.
- No live-provider acceptance tests yet. They will run in a separate CI job once sandbox/test accounts and credentials exist (kept apart from the synthetic-fixture tests).
- Additional sources from the research shortlist (Search Console, Klaviyo, HubSpot CRM) can plug into the same adapter interface.
