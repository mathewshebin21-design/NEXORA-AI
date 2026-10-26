"""Plan limits for subscription-ready usage tracking. No billing provider is connected."""

PLANS: dict[str, dict[str, int | None]] = {
    # None = unlimited
    "trial": {"seats": 5, "workspaces": 3, "connections": 8, "api_requests_month": 10_000, "ai_tokens_month": 0},
    "studio": {"seats": 15, "workspaces": 10, "connections": 40, "api_requests_month": 250_000, "ai_tokens_month": 2_000_000},
    "agency": {"seats": 50, "workspaces": 50, "connections": 250, "api_requests_month": 2_000_000, "ai_tokens_month": 10_000_000},
}


def limits(plan: str) -> dict[str, int | None]:
    return PLANS.get(plan, PLANS["trial"])
