"""Background sync worker.

    python -m nexora.worker            # run forever
    python -m nexora.worker --once     # drain due jobs and exit (cron-friendly)

Set NEXORA_EMBEDDED_WORKER=true to run the same loop in a daemon thread inside the API (development).
Several workers may run concurrently: jobs are claimed with FOR UPDATE SKIP LOCKED.
"""

import argparse
import logging
import threading
import time

from .config import get_settings
from .sync import process_available

log = logging.getLogger("nexora.worker")
_stop = threading.Event()


def loop(poll: float) -> None:
    while not _stop.is_set():
        try:
            if process_available() == 0:
                _stop.wait(poll)
        except Exception:
            log.exception("worker loop error")
            _stop.wait(poll)


def start_embedded() -> threading.Thread:
    t = threading.Thread(target=loop, args=(get_settings().worker_poll_seconds,), name="nexora-sync-worker", daemon=True)
    t.start()
    return t


def stop_embedded() -> None:
    _stop.set()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true")
    a = ap.parse_args()
    logging.basicConfig(level=logging.INFO)
    if a.once:
        print(f"processed {process_available(limit=10_000)} job(s)")
    else:
        try:
            loop(get_settings().worker_poll_seconds)
        except KeyboardInterrupt:
            time.sleep(0)
