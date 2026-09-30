"""SSB StatBank (PxWebApi v1, JSON-stat2).

STATUS: UTESTET. Skrevet mot dokumentert API-format (POST spørring -> json-stat2), men tabell-id-er
og variabelkoder MÅ verifiseres mot https://data.ssb.no/api/v0/no/table/<id> første gang pipeline
kjøres med nettverkstilgang. Koden feiler høylytt heller enn å gjette.
"""
from ..net import post_json

BASE = "https://data.ssb.no/api/v0/no/table/"

# UVERIFISERT: sjekk tabell-id og koder (Region/Tid/ContentsCode) i metadata før bruk.
TABLES = {
    "population": dict(id="07459", selections={"Region": ["0"], "Kjonn": ["0"], "Alder": ["999"], "ContentsCode": ["Personer1"]}),
    "gdp": dict(id="09189", selections={"Makrost": ["bnpb.nr23_9"], "ContentsCode": ["Priser"]}),
    "cpi": dict(id="03013", selections={"Konsumgrp": ["TOTAL"], "ContentsCode": ["KpiAar"]}),
}


def query(table_id: str, selections: dict, years: list[int]) -> dict:
    q = [{"code": k, "selection": {"filter": "item", "values": v}} for k, v in selections.items()]
    q.append({"code": "Tid", "selection": {"filter": "item", "values": [str(y) for y in years]}})
    return post_json(BASE + table_id, {"query": q, "response": {"format": "json-stat2"}})


def parse_jsonstat_by_time(js: dict) -> dict[int, float]:
    """Forutsetter at alle andre dimensjoner er valgt til ett element, slik at kun Tid varierer."""
    ids, sizes = js["id"], js["size"]
    if [s for i, s in zip(ids, sizes) if i != "Tid" and s != 1]:
        raise ValueError("Uventet flerverdi-dimensjon; presiser utvalget")
    tid = js["dimension"]["Tid"]["category"]["index"]
    values = js["value"]
    return {int(k): values[v] for k, v in tid.items() if values[v] is not None}


def fetch_year_series(key: str, years: list[int]) -> dict[int, float]:
    t = TABLES[key]
    return parse_jsonstat_by_time(query(t["id"], t["selections"], years))
