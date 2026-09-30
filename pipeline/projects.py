"""Kostnadsutvikling i store statlige prosjekter.

Ingen felles API. Pipeline:
  1) finner stortingssaker (data.stortinget.no) som kan omtale prosjektet (tittelsøk + budsjettinnstillinger fra aktuell komité),
  2) laster ned innstillingene som PDF fra stortinget.no (regjeringen.no og banenor.no blokkerer pipeline og omgås ikke),
  3) trekker ut kandidattall og tekst med sidehenvisning -> data/review/queue/<prosjekt>.json (ALDRI publisert),
  4) publiserer kun poster som er godkjent manuelt i data/review/approved/<prosjekt>.json. Hver godkjent post må ha kilde-URL,
     side og et sitat som faktisk finnes på den siden i det nedlastede dokumentet (kontrolleres ved hver kjøring).

Godkjenningsformat: se docs/prosjekter.md.
"""
import hashlib
import json
import re
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from . import net
from .sources import stortinget as st

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "pipeline" / "config" / "projects.json"
REVIEW = ROOT / "data" / "review"
STORTINGET = "https://www.stortinget.no"

AMOUNT_RE = re.compile(r"(\d{1,3}(?:[  ]\d{3})+|\d+(?:[.,]\d+)?)\s*(milliarder|millioner|mrd|mill)\b\.?\s*(?:kroner|kr)?", re.I)
PRICE_LEVEL_RE = re.compile(r"(?:(\d{4})[- ]kroner|prisnivå(?:et)?(?: i)? (\d{4})|(\d{4})-prisnivå)", re.I)
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-ZÆØÅ0-9])")


def load_config() -> dict:
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def to_mnok(num: str, unit: str) -> float:
    v = float(re.sub(r"[  ]", "", num).replace(",", "."))
    return v * 1000 if unit.lower().startswith(("mrd", "milliard")) else v


def parse_amounts(text: str) -> list[dict]:
    out = []
    for m in AMOUNT_RE.finditer(text):
        try:
            out.append(dict(raw=m.group(0).strip(), mnok=to_mnok(m.group(1), m.group(2))))
        except ValueError:
            continue
    return out


def price_levels(text: str) -> list[int]:
    return sorted({int(next(g for g in m.groups() if g)) for m in PRICE_LEVEL_RE.finditer(text)})


def guess_reasons(text: str, reason_words: dict) -> list[str]:
    low = text.lower()
    return [k for k, ws in reason_words.items() if any(w in low for w in ws)]


def innstilling_pdf(url: str) -> str | None:
    """Innstillingens sideadresse -> PDF-adresse på stortinget.no."""
    m = re.search(r"/Publikasjoner/Innstillinger/Stortinget/(\d{4}-\d{4})/(inns-[\w-]+?)/?$", url.split("?")[0])
    return f"{STORTINGET}/globalassets/pdf/innstillinger/stortinget/{m.group(1)}/{m.group(2)}.pdf" if m else None


def case_documents(case_id: str) -> list[dict]:
    root = st._xml(f"sak?sakid={case_id}", 24 * 30)
    docs = []
    for ref in root.iter(st.NS + "publikasjon_referanse"):
        url = st._text(ref, "lenke_url")
        url = ("https:" + url) if url.startswith("//") else url
        docs.append(dict(title=st._text(ref, "lenke_tekst"), url=url, type=st._text(ref, "type")))
    return docs


def pdf_pages(url: str) -> list[str]:
    import logging

    import pypdf
    logging.getLogger("pypdf").setLevel(logging.ERROR)
    data = net.cached_get(url, ttl_hours=24 * 365)
    r = pypdf.PdfReader(BytesIO(data))
    return [re.sub(r"\s+", " ", p.extract_text() or "").strip() for p in r.pages]


def extract_candidates(pages: list[str], project: dict, cfg: dict) -> list[dict]:
    kws = project["keywords"]
    out = []
    for pno, text in enumerate(pages, 1):
        low = text.lower()
        if not any(k in low for k in kws):
            continue
        sents = SENT_SPLIT.split(text)
        for i, s in enumerate(sents):
            window = " ".join(sents[max(0, i - 1): i + 2])
            amounts = parse_amounts(s)
            if not amounts or not any(w in window.lower() for w in cfg["cost_words"]):
                continue
            if not any(k in window.lower() for k in kws):
                continue
            out.append(dict(page=pno, snippet=window[:700], amounts=amounts, price_levels=price_levels(window),
                            reason_guess=guess_reasons(window, cfg["reason_words"])))
    return out


def find_cases(project: dict, cfg: dict, log=print) -> dict[str, dict]:
    """Saker som kan omtale prosjektet: tittelsøk + budsjettinnstillinger fra prosjektets komité + faste saks-ID-er."""
    rx = re.compile(project["case_title_regex"], re.I)
    cases: dict[str, dict] = {}
    for sess in cfg["sessions"]:
        for sak in st._xml(f"saker?sesjonid={sess}", 24 * 30).iter(st.NS + "sak"):
            title = st._text(sak, "tittel") + " " + st._text(sak, "korttittel")
            ref = st._text(sak, "henvisning")
            komite = st._text(sak.find(st.NS + "komite"), "id") if sak.find(st.NS + "komite") is not None else ""
            budget = "Prop. 1 S" in ref and komite in project["budget_committees"]
            if rx.search(title) or budget:
                cases[st._text(sak, "id")] = dict(id=st._text(sak, "id"), session=sess, reference=ref, title=title.strip()[:160], committee=komite, kind="budsjett" if budget else "tittel")
    for cid in project.get("extra_case_ids", []):
        cases.setdefault(cid, dict(id=cid, session="", reference="", title="", committee="", kind="fast"))
    log(f"  {project['id']}: {len(cases)} kandidatsaker")
    return cases


def build_queue(project: dict, cfg: dict, log=print) -> dict:
    cases = find_cases(project, cfg, log)
    docs, cands, skipped = {}, [], []
    for cid, c in cases.items():
        try:
            refs = case_documents(cid)
        except Exception as e:  # noqa: BLE001
            skipped.append(dict(case_id=cid, reason=repr(e)))
            continue
        for d in refs:
            if d["type"] != "innstilling":
                if "regjeringen.no" in d["url"]:
                    skipped.append(dict(case_id=cid, url=d["url"], reason="regjeringen.no er ikke tilgjengelig fra pipelinen"))
                continue
            pdf = innstilling_pdf(d["url"])
            if not pdf or pdf in docs:
                continue
            try:
                pages = pdf_pages(pdf)
            except Exception as e:  # noqa: BLE001
                skipped.append(dict(case_id=cid, url=pdf, reason=repr(e)))
                continue
            found = extract_candidates(pages, project, cfg)
            docs[pdf] = dict(url=pdf, title=d["title"], case_id=cid, case_reference=c["reference"], session=c["session"], n_pages=len(pages), n_candidates=len(found))
            for f in found:
                key = hashlib.sha256(f"{pdf}|{f['page']}|{f['snippet']}".encode()).hexdigest()[:12]
                cands.append(dict(id=key, status="pending", doc_url=pdf, doc_title=d["title"], case_id=cid, locator=f"s. {f['page']}", **f))
        log(f"    sak {cid}: {sum(1 for x in cands if x['case_id'] == cid)} kandidater")
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    return dict(project_id=project["id"], generated_at=now, note="Automatisk uttrekk. Ikke publisert. Godkjenn manuelt i data/review/approved/.",
                cases=list(cases.values()), documents=list(docs.values()), skipped=skipped, candidates=cands)


# --- godkjente poster ---
KINDS = {"cost_frame", "cost_change", "incurred", "status", "decision"}
REASONS = {"scope", "price", "requirements", "uncertainty", "other", None}


def load_approved(project_id: str) -> dict:
    p = REVIEW / "approved" / f"{project_id}.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else dict(project_id=project_id, entries=[])


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.replace(" ", " ")).strip().lower()


def verify_entry(e: dict, pages_of) -> list[str]:
    errs = []
    for k in ("id", "kind", "source_url", "page", "quote", "reviewed_by", "reviewed_at"):
        if not e.get(k):
            errs.append(f"{e.get('id', '?')}: mangler {k}")
    if errs:
        return errs
    if e["kind"] not in KINDS:
        errs.append(f"{e['id']}: ugyldig kind {e['kind']}")
    if e["kind"] in ("cost_frame", "cost_change", "incurred"):
        for k in ("date", "amount_mnok", "amount_type"):
            if e.get(k) in (None, ""):
                errs.append(f"{e['id']}: mangler {k}")
        if e.get("price_level_year") is None and not e.get("price_level_unknown"):
            errs.append(f"{e['id']}: angi price_level_year eller price_level_unknown=true")
    if e.get("reason_category") not in REASONS:
        errs.append(f"{e['id']}: ugyldig reason_category")
    try:
        pages = pages_of(e["source_url"])
        if norm(e["quote"]) not in norm(pages[e["page"] - 1]):
            errs.append(f"{e['id']}: sitatet finnes ikke på side {e['page']} i {e['source_url']}")
    except Exception as ex:  # noqa: BLE001
        errs.append(f"{e['id']}: kunne ikke kontrollere kilde ({ex!r})")
    return errs


def build_all(log=print, pages_of=pdf_pages) -> dict:
    cfg = load_config()
    out, all_errs = [], []
    (REVIEW / "queue").mkdir(parents=True, exist_ok=True)
    (REVIEW / "approved").mkdir(parents=True, exist_ok=True)
    for pr in cfg["projects"]:
        q = build_queue(pr, cfg, log)
        approved = load_approved(pr["id"])
        errs = [x for e in approved["entries"] for x in verify_entry(e, pages_of)]
        ids = [e.get("id") for e in approved["entries"]]
        errs += [f"duplikat id {i}" for i in set(ids) if ids.count(i) > 1]
        all_errs += errs
        (REVIEW / "queue" / f"{pr['id']}.json").write_text(json.dumps(q, ensure_ascii=False, indent=1), encoding="utf-8")
        approved_ids = {e.get("queue_id") for e in approved["entries"]}
        out.append(dict(id=pr["id"], name_nb=pr["name_nb"], name_en=pr["name_en"], agency=pr["agency"], ministry=pr["ministry"], storting_area=pr["storting_area"],
                        status_note=approved.get("status_note"), entries=sorted(approved["entries"], key=lambda e: (e.get("date") or "", e["id"])),
                        queue=dict(generated_at=q["generated_at"], n_candidates=len(q["candidates"]), n_pending=sum(1 for c in q["candidates"] if c["id"] not in approved_ids),
                                   n_documents=len(q["documents"]), documents=q["documents"], skipped=q["skipped"]),
                        case_ids=[c["id"] for c in q["cases"]]))
    if all_errs:
        raise ValueError("godkjente poster feilet kontroll:\n  " + "\n  ".join(all_errs[:30]))
    return dict(generated_at=datetime.now(timezone.utc).replace(microsecond=0).isoformat(), source_note="Kun manuelt godkjente poster er publisert.", projects=out)
