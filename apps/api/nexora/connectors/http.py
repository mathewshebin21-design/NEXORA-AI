"""HTTP client for provider APIs: timeouts, retries with exponential backoff + jitter,
Retry-After support and a per-client minimum request interval (simple rate limiting)."""

import random
import time
from collections.abc import Callable

import httpx

TRANSIENT_STATUS = {408, 425, 429, 500, 502, 503, 504}


class ProviderError(Exception):
    def __init__(self, message: str, *, transient: bool, status: int | None = None):
        super().__init__(message)
        self.transient = transient
        self.status = status


class ProviderHttp:
    def __init__(
        self,
        *,
        provider: str,
        min_interval_s: float = 0.2,
        max_retries: int = 4,
        base_backoff_s: float = 1.0,
        timeout_s: float = 30.0,
        transport: httpx.BaseTransport | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ):
        self.provider = provider
        self.min_interval_s = min_interval_s
        self.max_retries = max_retries
        self.base_backoff_s = base_backoff_s
        self._sleep = sleep
        self._last = 0.0
        self._client = httpx.Client(timeout=timeout_s, transport=transport, headers={"User-Agent": "NexoraAI/0.3 (+connectors)"})

    def close(self) -> None:
        self._client.close()

    def _throttle(self) -> None:
        wait = self.min_interval_s - (time.monotonic() - self._last)
        if wait > 0:
            self._sleep(wait)
        self._last = time.monotonic()

    def request(self, method: str, url: str, **kw) -> httpx.Response:
        for attempt in range(self.max_retries + 1):
            self._throttle()
            try:
                r = self._client.request(method, url, **kw)
            except httpx.TransportError as e:
                if attempt == self.max_retries:
                    raise ProviderError(f"{self.provider}: network error {e.__class__.__name__}", transient=True) from e
                self._sleep(self._backoff(attempt, None))
                continue
            if r.status_code < 400:
                return r
            if r.status_code in TRANSIENT_STATUS and attempt < self.max_retries:
                self._sleep(self._backoff(attempt, r.headers.get("retry-after")))
                continue
            raise ProviderError(
                f"{self.provider}: HTTP {r.status_code} {_safe_body(r)}",
                transient=r.status_code in TRANSIENT_STATUS,
                status=r.status_code,
            )
        raise ProviderError(f"{self.provider}: retries exhausted", transient=True)  # pragma: no cover

    def _backoff(self, attempt: int, retry_after: str | None) -> float:
        if retry_after:
            try:
                return min(60.0, float(retry_after))
            except ValueError:
                pass
        return min(60.0, self.base_backoff_s * (2**attempt)) * (0.75 + random.random() * 0.5)  # noqa: S311


def _safe_body(r: httpx.Response) -> str:
    """Short error excerpt for logs/UI; never echoes request headers or tokens."""
    return r.text[:300].replace("\n", " ")
