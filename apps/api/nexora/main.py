import json
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .config import get_settings
from .db import SessionLocal
from .routers import auth, connections, governance, orgs, public, workspaces

settings = get_settings()

log = logging.getLogger("nexora")
if not log.handlers:
    h = logging.StreamHandler()
    h.setFormatter(logging.Formatter("%(message)s"))
    log.addHandler(h)
    log.setLevel(logging.INFO)

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.embedded_worker:
        from .worker import start_embedded, stop_embedded

        start_embedded()
        yield
        stop_embedded()
    else:
        yield


app = FastAPI(title="NEXORA AI API", version="0.3.0", docs_url="/docs", redoc_url=None, lifespan=lifespan)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
    start = time.perf_counter()
    # CSRF: cookie-authenticated state changes must carry a custom header (not settable cross-site without CORS,
    # which this API does not grant) and, when present, a trusted Origin. Bearer (API key) requests are exempt.
    if request.method not in SAFE_METHODS and not request.headers.get("authorization"):
        origin = request.headers.get("origin")
        if request.headers.get(settings.csrf_header) != "1" or (origin and origin not in settings.allowed_origins):
            return JSONResponse({"detail": "CSRF check failed"}, status_code=403, headers={"x-request-id": rid})
    response = await call_next(request)
    response.headers["x-request-id"] = rid
    response.headers["x-content-type-options"] = "nosniff"
    response.headers["x-frame-options"] = "DENY"
    response.headers["referrer-policy"] = "strict-origin-when-cross-origin"
    response.headers.setdefault("cache-control", "no-store")
    log.info(
        json.dumps(
            {
                "event": "http",
                "rid": rid,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "ms": round((time.perf_counter() - start) * 1000, 1),
            }
        )
    )
    return response


@app.get("/health", tags=["ops"])
def health():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ok", "version": app.version}


app.include_router(auth.router)
app.include_router(orgs.router)
app.include_router(workspaces.router)
app.include_router(governance.router)
app.include_router(public.router)
app.include_router(connections.router)
