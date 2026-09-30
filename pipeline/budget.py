"""Vedtatt statsbudsjett for utlandsposter, hentet fra Stortingets data og klassifisert etter pipeline/config/definition.json.

Kun poster i utgiftsdelen. Tall er hele kroner slik Stortinget vedtok dem (Innst. S på Prop. 1 S).
Hver rad får: kilde-URL (saken på stortinget.no), voteringsid, saksnummer, hentedato, beløpstype `vedtatt`, løpende kroner.
Revidert nasjonalbudsjett og tilleggsbevilgninger er IKKE innarbeidet (se docs/datahull.md).
"""
import json
from pathlib import Path

from .sources import budget_lines as bl
from .sources import stortinget as st

DEFINITION = Path(__file__).resolve().parent / "config" / "definition.json"


def load_definition() -> dict:
    return json.loads(DEFINITION.read_text(encoding="utf-8"))


def classify(row: dict, definition: dict) -> dict | None:
    """Første regel som treffer (kapittel, evt. post). Returnerer regel eller None."""
    cats = {c["id"]: c for c in definition["categories"]}
    for r in definition["rules"]:
        if r["kapittel"] == row["chapter"] and (r.get("post") is None or r["post"] == row["post"]) and (r.get("years") is None or row["budget_year"] in r["years"]):
            if r.get("expect") and r["expect"].lower() not in (row["name"] + " " + row["chapter_name"]).lower():
                raise ValueError(f"regel for kap. {r['kapittel']} post {r.get('post')} forventer «{r['expect']}», men posten heter «{row['name']}» ({row['budget_year']}). Gjennomgå definisjonen.")
            c = cats[r["category"]]
            return dict(category_id=c["id"], nature=r.get("nature", c["nature"]), commitment=r.get("commitment", c["commitment"]))
    return None


def in_range(chapter: str) -> bool:
    return chapter.isdigit() and (100 <= int(chapter) <= 199 or 1700 <= int(chapter) <= 1799)


def fetch_rows(sessions: list[str], log=print) -> list[dict]:
    """Alle utgiftsposter i UD-/FD-kapitler (100–199, 1700–1799) fra vedtatte budsjettvoteringer."""
    out, seen, done = [], {}, set()
    for sess in sessions:
        year = int(sess.split("-")[1])
        for case in st.budget_cases(sess):
            if case["kind"] != "statsbudsjett":
                continue
            for v in st.votes_for_case(case["id"]):
                if not v["adopted"] or v["id"] in done:  # samme votering kan høre til flere saker
                    continue
                done.add(v["id"])
                for p in st.raw_proposals(v["id"]):
                    if p["type"] != "tilraading" or "bevilges" not in p["html"]:
                        continue
                    by = bl.budget_year(p["html"])
                    if by != year or "Svalbardbudsjettet" in p["html"][:400]:
                        continue
                    for r in bl.parse_budget_html(p["html"]):
                        if r["section"] != "Utgifter" or r["post"] is None or not in_range(r["chapter"]):
                            continue
                        key = (by, r["chapter"], r["post"])
                        if key in seen:
                            raise ValueError(f"duplikat budsjettpost {key} (votering {v['id']} og {seen[key]})")
                        seen[key] = v["id"]
                        out.append(dict(budget_year=by, chapter=r["chapter"], chapter_name=r["chapter_name"], post=r["post"], name=r["name"],
                                        amount_nok=r["amount_nok"], case_ref=case["reference"], vote_id=v["id"], vote_time=v["time"],
                                        source_ref=case["url"]))
        log(f"  budsjett {sess}: {sum(1 for r in out if r['budget_year'] == year)} poster")
    return out


def classify_all(rows: list[dict], definition: dict) -> list[dict]:
    res = []
    for r in rows:
        c = classify(r, definition)
        if c is None and r["chapter"].isdigit() and 150 <= int(r["chapter"]) <= 172:
            raise ValueError(f"ikke klassifisert bistandspost: kap. {r['chapter']} post {r['post']} «{r['name']}» ({r['budget_year']}). Legg til regel i definition.json.")
        res.append(dict(r, in_scope=c is not None, **(c or dict(category_id=None, nature=None, commitment=None))))
    return res


def totals(rows: list[dict]) -> dict[int, dict[str, int]]:
    """budsjettår -> kategori -> kroner (bare poster i avgrensningen)."""
    out: dict[int, dict[str, int]] = {}
    for r in rows:
        if r["in_scope"]:
            out.setdefault(r["budget_year"], {}).setdefault(r["category_id"], 0)
            out[r["budget_year"]][r["category_id"]] += r["amount_nok"]
    return out
