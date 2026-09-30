import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline import projects as pr  # noqa: E402

CFG = pr.load_config()
FOLLO = CFG["projects"][0]


def test_parse_amounts_and_units():
    a = pr.parse_amounts("Kostnadsrammen er 36 000 mill. kroner, tidligere 30,5 mrd. kroner og 370 millioner kroner.")
    assert [round(x["mnok"], 1) for x in a] == [36000.0, 30500.0, 370.0]


def test_price_level_detection():
    assert pr.price_levels("i 2018-kroner og prisnivå 2020") == [2018, 2020]


def test_extract_candidates_requires_keyword_amount_and_cost_word():
    pages = ["Om annet: kostnaden er 100 mill. kroner.", "Follobanen har fått kostnadsramme på 36 000 mill. kroner i 2018-kroner. Årsaken er usikkerhet i grunnforhold.", "Follobanen åpnet."]
    c = pr.extract_candidates(pages, FOLLO, CFG)
    assert len(c) == 1 and c[0]["page"] == 2 and c[0]["amounts"][0]["mnok"] == 36000 and c[0]["price_levels"] == [2018] and "uncertainty" in c[0]["reason_guess"]


def test_innstilling_pdf_url():
    u = "https://www.stortinget.no/no/Saker-og-publikasjoner/Publikasjoner/Innstillinger/Stortinget/2018-2019/inns-201819-382s/"
    assert pr.innstilling_pdf(u) == "https://www.stortinget.no/globalassets/pdf/innstillinger/stortinget/2018-2019/inns-201819-382s.pdf"
    assert pr.innstilling_pdf("https://www.regjeringen.no/id/x") is None


GOOD = dict(id="e1", kind="cost_frame", date="2018-06-01", amount_mnok=36000, amount_type="kostnadsramme", price_level_year=2018, source_url="https://x/doc.pdf", page=2,
            quote="kostnadsramme på 36 000 mill. kroner", reviewed_by="tester", reviewed_at="2026-01-01")
PAGES = lambda url: ["side 1", "Follobanen har kostnadsramme på 36 000 mill. kroner."]  # noqa: E731


def test_verified_entry_passes_and_quote_must_exist_on_page():
    assert pr.verify_entry(GOOD, PAGES) == []
    assert any("sitatet finnes ikke" in e for e in pr.verify_entry(dict(GOOD, page=1), PAGES))
    assert any("sitatet finnes ikke" in e for e in pr.verify_entry(dict(GOOD, quote="helt annen tekst"), PAGES))


def test_entry_requires_source_page_reviewer_and_price_level():
    assert any("mangler source_url" in e for e in pr.verify_entry({k: v for k, v in GOOD.items() if k != "source_url"}, PAGES))
    assert any("price_level" in e for e in pr.verify_entry(dict(GOOD, price_level_year=None), PAGES))
    assert pr.verify_entry(dict(GOOD, price_level_year=None, price_level_unknown=True), PAGES) == []
    assert any("reason_category" in e for e in pr.verify_entry(dict(GOOD, reason_category="feil"), PAGES))


def test_repo_approved_files_are_valid_structure():
    for p in CFG["projects"]:
        a = pr.load_approved(p["id"])
        assert a["project_id"] == p["id"] and isinstance(a["entries"], list)
