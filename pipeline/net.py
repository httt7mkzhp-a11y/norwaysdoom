"""Minimal HTTP-hjelper (stdlib). Respekterer HTTPS_PROXY/SSL_CERT_FILE fra miljøet."""
import json
import urllib.request

UA = "norwaysdoom-pipeline/0.1 (+https://github.com/httt7mkzhp-a11y/norwaysdoom)"


def get(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def post_json(url: str, payload: dict, timeout: int = 60) -> dict:
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST",
                                 headers={"User-Agent": UA, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())
