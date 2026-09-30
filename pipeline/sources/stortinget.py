"""Stortingets åpne data (data.stortinget.no, XML, versjon 1.6). Testet mot live-API 2026-09-30.

Endepunkter (alle GET, namespace http://data.stortinget.no):
  saker?sesjonid=YYYY-YYYY              saker med henvisning, komité, emner, status
  voteringer?sakid=ID                   voteringer på en sak (tema, tid, antall for/mot/ikke til stede, vedtatt)
  voteringsresultat?voteringid=ID       stemme per representant (for/mot/ikke_tilstede) - kun personlige voteringer
  voteringsforslag?voteringid=ID        forslagene det stemmes over (betegnelse, forslagsstiller, tekst)
  partier?sesjonid=…, komiteer?sesjonid=…

Merk: ikke-personlige voteringer (f.eks. enstemmig vedtatt) har ingen resultater per representant; antall er -1.
Vilkår: data.stortinget.no er åpne data (Norsk lisens for offentlige data, NLOD). Ikke overbelast tjenesten (se net.py).
"""
import html
import re
import xml.etree.ElementTree as ET

from ..net import cached_get

BASE = "https://data.stortinget.no/eksport/"
NS = "{http://data.stortinget.no}"
SAK_URL = "https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p={}"
FOREIGN_COMMITTEE = "UFK"
ONE_YEAR = 24 * 365


def session_id(budget_year: int) -> str:
    """Statsbudsjettet for år X vedtas i sesjonen (X-1)–X."""
    return f"{budget_year - 1}-{budget_year}"


def _text(el, tag: str) -> str:
    c = el.find(NS + tag) if el is not None else None
    return (c.text or "").strip() if c is not None else ""


def _xml(endpoint: str, ttl_hours: float) -> ET.Element:
    return ET.fromstring(cached_get(BASE + endpoint, ttl_hours=ttl_hours))


def classify(reference: str, title: str) -> str | None:
    """Budsjettsaktype, eller None hvis saken ikke er en budsjettsak."""
    t = title.lower()
    if "prop. 1 s" in reference.lower():
        return "statsbudsjett"
    if "revidert nasjonalbudsjett" in t:
        return "revidert"
    if "tilleggsbevilgninger" in t or "ny saldering" in t:
        return "tillegg"
    if ("endring" in t or "endringar" in t) and "statsbudsjettet" in t:
        return "endring"
    return None


def tag_areas(text: str, areas: list[dict], topics: list[str] | None = None) -> list[str]:
    low = text.lower()
    out = []
    for a in areas:
        if any(re.search(r"(?<!\w)" + re.escape(k), low) for k in a["keywords"]) or (topics and any(t in topics for t in a.get("topics", []))):
            out.append(a["id"])
    return out


def parse_cases(xml: bytes | ET.Element, session: str = "", areas: list[dict] | None = None) -> list[dict]:
    root = ET.fromstring(xml) if isinstance(xml, bytes) else xml
    out = []
    for sak in root.iter(NS + "sak"):
        ref, full_title = _text(sak, "henvisning"), _text(sak, "tittel")
        title = _text(sak, "korttittel") or full_title
        topics = [_text(e, "navn") for e in sak.iter(NS + "emne")]
        kind = classify(ref, full_title)
        found = tag_areas(f"{title} {full_title}", areas or [], topics) if areas else []
        if not kind and not found:
            continue
        sid = _text(sak, "id")
        kom = sak.find(NS + "komite")
        out.append(dict(id=sid, session=session, kind=kind or "annen", reference=ref, title=title, status=_text(sak, "status"),
                        committee=_text(kom, "id"), date=_text(sak, "sist_oppdatert_dato")[:10], topics=topics,
                        areas=found, url=SAK_URL.format(sid)))
    return sorted(out, key=lambda c: (c["date"], c["id"]), reverse=True)


def budget_cases(session: str, areas: list[dict] | None = None) -> list[dict]:
    return parse_cases(_xml(f"saker?sesjonid={session}", 12), session, areas)


def foreign_budget_cases(cases: list[dict]) -> list[dict]:
    return [c for c in cases if c["kind"] == "statsbudsjett" and c["committee"] == FOREIGN_COMMITTEE]


def parties(session: str) -> list[dict]:
    return [dict(id=_text(p, "id"), name=_text(p, "navn")) for p in _xml(f"partier?sesjonid={session}", 24 * 7).iter(NS + "parti")]


def committees(session: str) -> list[dict]:
    return [dict(id=_text(p, "id"), name=_text(p, "navn")) for p in _xml(f"komiteer?sesjonid={session}", 24 * 7).iter(NS + "komite")]


def _int(s: str) -> int:
    try:
        return int(s)
    except ValueError:
        return -1


def parse_votes(root: ET.Element, case_id: str) -> list[dict]:
    out = []
    for v in root.iter(NS + "sak_votering"):
        out.append(dict(
            id=_text(v, "votering_id"), case_id=case_id, time=_text(v, "votering_tid")[:19], theme=_text(v, "votering_tema"),
            order=_int(_text(v, "behandlingsrekkefoelge")), agenda_no=_text(v, "dagsorden_sak_nummer"),
            adopted=_text(v, "vedtatt") == "true", result_type=_text(v, "votering_resultat_type"),
            result_text=_text(v, "votering_resultat_type_tekst"), personal=_text(v, "personlig_votering") == "true",
            n_for=_int(_text(v, "antall_for")), n_against=_int(_text(v, "antall_mot")), n_absent=_int(_text(v, "antall_ikke_tilstede"))))
    return out


def votes_for_case(case_id: str) -> list[dict]:
    return parse_votes(_xml(f"voteringer?sakid={case_id}", ONE_YEAR), case_id)


CODE = {"for": "f", "mot": "m", "ikke_tilstede": "a"}


def parse_results(root: ET.Element) -> tuple[dict[str, str], dict[str, dict]]:
    """(rep_id -> f/m/a, rep_id -> {name, party, county}). Stemmen er registrert på representanten som møtte."""
    votes, reps = {}, {}
    for r in root.iter(NS + "representant_voteringsresultat"):
        rep = r.find(NS + "representant")
        rid = _text(rep, "id")
        code = CODE.get(_text(r, "votering"))
        if not rid or code is None:
            raise ValueError(f"ukjent stemmeverdi for {rid}: {_text(r, 'votering')!r}")
        votes[rid] = code
        reps[rid] = dict(name=f"{_text(rep, 'fornavn')} {_text(rep, 'etternavn')}".strip(), party=_text(rep.find(NS + "parti"), "id"),
                         party_name=_text(rep.find(NS + "parti"), "navn"), county=_text(rep.find(NS + "fylke"), "navn"))
    return votes, reps


def results_for_vote(vote_id: str) -> tuple[dict[str, str], dict[str, dict]]:
    return parse_results(_xml(f"voteringsresultat?voteringid={vote_id}", ONE_YEAR))


def _plain(s: str, limit: int = 500) -> str:
    s = re.sub(r"<[^>]+>", " ", html.unescape(s))
    s = re.sub(r"\s+", " ", html.unescape(s)).strip()
    return s if len(s) <= limit else s[:limit].rsplit(" ", 1)[0] + " …"


def parse_proposals(root: ET.Element) -> list[dict]:
    out = []
    for f in root.iter(NS + "voteringsforslag"):
        rep = f.find(NS + "forslag_levert_av_representant")
        out.append(dict(label=_text(f, "forslag_betegnelse"), short=_text(f, "forslag_betegnelse_kort"), type=_text(f, "forslag_type"),
                        by_text=_text(f, "forslag_paa_vegne_av_tekst"), by_parties=[_text(p, "id") for p in f.iter(NS + "parti")],
                        text=_plain(_text(f, "forslag_tekst"))))
    return out


def proposals_for_vote(vote_id: str) -> list[dict]:
    return parse_proposals(_xml(f"voteringsforslag?voteringid={vote_id}", ONE_YEAR))
