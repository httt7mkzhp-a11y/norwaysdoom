"""Stortingets åpne data (data.stortinget.no, XML, versjon 1.6).

STATUS: testet mot live-API 2026-09-30 (endepunkt `saker?sesjonid=YYYY-YYYY`, namespace http://data.stortinget.no).
Brukes til å finne budsjettsaker: referanser (Prop./Innst.), komité, status og vedtaksdato til kildelenker.
Beløp per mottaker står i Gul bok/Prop. 1 S (PDF/HTML) og dekkes av manuell import.
"""
import xml.etree.ElementTree as ET

from ..net import get

BASE = "https://data.stortinget.no/eksport/"
NS = "{http://data.stortinget.no}"
SAK_URL = "https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p={}"
# Komiteen som behandler Utenriksdepartementets budsjett (bistand, FN, EØS).
FOREIGN_COMMITTEE = "UFK"


def session_id(budget_year: int) -> str:
    """Statsbudsjettet for år X vedtas i sesjonen (X-1)–X."""
    return f"{budget_year - 1}-{budget_year}"


def _text(el, tag: str) -> str:
    c = el.find(NS + tag)
    return (c.text or "").strip() if c is not None else ""


def classify(reference: str, title: str) -> str | None:
    """Returnerer budsjettsaktype eller None hvis saken ikke er en budsjettsak."""
    t = title.lower()
    if "prop. 1 s" in reference.lower() and " l " not in reference.lower():
        return "statsbudsjett"
    if "revidert nasjonalbudsjett" in t:
        return "revidert"
    if "tilleggsbevilgninger" in t or "ny saldering" in t:
        return "tillegg"
    if ("endring" in t or "endringar" in t) and "statsbudsjettet" in t:
        return "endring"
    return None


def parse_cases(xml: bytes) -> list[dict]:
    out = []
    for sak in ET.fromstring(xml).iter(NS + "sak"):
        ref, title = _text(sak, "henvisning"), _text(sak, "korttittel") or _text(sak, "tittel")
        kind = classify(ref, _text(sak, "tittel"))
        if not kind:
            continue
        sid = _text(sak, "id")
        kom = sak.find(NS + "komite")
        out.append(dict(id=sid, kind=kind, reference=ref, title=title, status=_text(sak, "status"),
                        committee=_text(kom, "id") if kom is not None else "",
                        date=_text(sak, "sist_oppdatert_dato")[:10], url=SAK_URL.format(sid)))
    return sorted(out, key=lambda c: (c["date"], c["id"]), reverse=True)


def budget_cases(session: str) -> list[dict]:
    return parse_cases(get(f"{BASE}saker?sesjonid={session}"))


def foreign_budget_cases(cases: list[dict]) -> list[dict]:
    """Hovedvedtaket om utenriksbudsjettet (Innst. fra UFK på Prop. 1 S)."""
    return [c for c in cases if c["kind"] == "statsbudsjett" and c["committee"] == FOREIGN_COMMITTEE]
