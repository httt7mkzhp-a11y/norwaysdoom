"""SSB StatBank (PxWebApi v0, JSON-stat2). Testet mot live-API 2026-09-30.

Tabeller (verifisert mot metadata):
  06913  Befolkning og endringer, Region=0 (hele landet), ContentsCode=Folkemengde (befolkning 1. januar)
  09189  Makroøkonomiske hovedstørrelser, Makrost=bnpb.nr23_9 (BNP, markedsverdi), ContentsCode=Priser (løpende mill. kr)
  03013  Konsumprisindeks, Konsumgrp=TOTAL, ContentsCode=KpiIndMnd (2015=100), månedlig; årsgjennomsnitt beregnes av 12 måneder

Skattytere (antall) hentes ikke: ingen tabell er verifisert. Se docs/datahull.md.
Vilkår: SSB-data er lisensiert under CC BY 4.0 (kreditér SSB). Kall er få og små.
"""
from ..net import get, post_json

API = "https://data.ssb.no/api/v0/no/table/"
PAGE = "https://www.ssb.no/statbank/table/{}"

TABLES = {
    "population": dict(id="06913", selections={"Region": ["0"], "ContentsCode": ["Folkemengde"]}, unit="personer 1. januar", price="n/a"),
    "gdp": dict(id="09189", selections={"Makrost": ["bnpb.nr23_9"], "ContentsCode": ["Priser"]}, unit="mill. kr", price="løpende"),
    "cpi": dict(id="03013", selections={"Konsumgrp": ["TOTAL"], "ContentsCode": ["KpiIndMnd"]}, unit="indeks 2015=100", price="n/a"),
}


def query(table_id: str, selections: dict, periods: list[str]) -> dict:
    q = [{"code": k, "selection": {"filter": "item", "values": v}} for k, v in selections.items()]
    q.append({"code": "Tid", "selection": {"filter": "item", "values": periods}})
    return post_json(API + table_id, {"query": q, "response": {"format": "json-stat2"}})


def parse_jsonstat_by_time(js: dict) -> dict[str, float]:
    """Forutsetter at alle andre dimensjoner er valgt til ett element, slik at bare Tid varierer."""
    ids, sizes = js["id"], js["size"]
    if [s for i, s in zip(ids, sizes) if i != "Tid" and s != 1]:
        raise ValueError("Uventet flerverdi-dimensjon; presiser utvalget")
    tid = js["dimension"]["Tid"]["category"]["index"]
    values = js["value"]
    return {k: values[v] for k, v in tid.items() if values[v] is not None}


def available_years(table_id: str) -> list[str]:
    import json
    meta = json.loads(get(API + table_id))
    return next(v["values"] for v in meta["variables"] if v["code"] == "Tid")


def cpi_annual_average(monthly: dict[str, float]) -> dict[int, float]:
    """Årsgjennomsnitt av månedsindeks. Bare år med alle 12 måneder."""
    by: dict[int, list[float]] = {}
    for k, v in monthly.items():
        by.setdefault(int(k[:4]), []).append(v)
    return {y: round(sum(v) / 12, 4) for y, v in by.items() if len(v) == 12}


def fetch(key: str, years: list[int]) -> tuple[dict[int, float], dict]:
    """(år -> verdi, kildeinfo). Beregner ikke noe utover årsgjennomsnitt for KPI."""
    t = TABLES[key]
    avail = set(available_years(t["id"]))
    if key == "cpi":
        periods = [f"{y}M{m:02d}" for y in years for m in range(1, 13) if f"{y}M{m:02d}" in avail]
        js = query(t["id"], t["selections"], periods)
        vals = cpi_annual_average(parse_jsonstat_by_time(js))
    else:
        periods = [str(y) for y in years if str(y) in avail]
        js = query(t["id"], t["selections"], periods)
        vals = {int(k): v for k, v in parse_jsonstat_by_time(js).items()}
    info = dict(table=t["id"], url=PAGE.format(t["id"]), updated=js.get("updated"), unit=t["unit"], price=t["price"], label=js.get("label"))
    return vals, info
