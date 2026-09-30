"""HTTP-hjelper (stdlib): riktig User-Agent, rate limiting, retry med backoff og diskcache.

Respekterer HTTPS_PROXY/SSL_CERT_FILE fra miljøet. Omgår ingen blokkeringer: ved 403/429 gis opp etter få forsøk.
"""
import hashlib
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

UA = "norwaysdoom-pipeline/0.2 (+https://github.com/httt7mkzhp-a11y/norwaysdoom; åpen datapipeline, lav frekvens)"
CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "cache"
MIN_INTERVAL = 0.4  # sekunder mellom kall (per prosess)
_last = 0.0


def _throttle() -> None:
    global _last
    wait = _last + MIN_INTERVAL - time.monotonic()
    if wait > 0:
        time.sleep(wait)
    _last = time.monotonic()


def get(url: str, timeout: int = 30, retries: int = 3) -> bytes:
    delay = 2.0
    for attempt in range(retries + 1):
        _throttle()
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (403, 404, 400) or attempt == retries:
                raise
        except (urllib.error.URLError, TimeoutError):
            if attempt == retries:
                raise
        time.sleep(delay)
        delay *= 2
    raise RuntimeError("uoppnåelig")


def cached_get(url: str, ttl_hours: float = 24.0, cache_dir: Path | None = None) -> bytes:
    """Henter fra diskcache hvis nyere enn ttl_hours; ellers fra nettet. Avsluttede voteringer endres ikke, bruk stor ttl."""
    d = cache_dir or CACHE_DIR
    d.mkdir(parents=True, exist_ok=True)
    f = d / (hashlib.sha256(url.encode()).hexdigest()[:32] + ".bin")
    if f.exists() and (time.time() - f.stat().st_mtime) < ttl_hours * 3600:
        return f.read_bytes()
    data = get(url)
    f.write_bytes(data)
    return data


def post_json(url: str, payload: dict, timeout: int = 60) -> dict:
    _throttle()
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST",
                                 headers={"User-Agent": UA, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())
