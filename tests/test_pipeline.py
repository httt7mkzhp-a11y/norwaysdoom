import copy
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline import mock_data, validate  # noqa: E402
from pipeline.sources import manual_import  # noqa: E402


def ds():
    return mock_data.generate("2026-01-01T00:00:00+00:00")


def test_mock_is_valid_and_flagged():
    d = ds()
    assert validate.validate(d) == []
    assert d["meta"]["dataMode"] == "mock"
    assert not any(f["verified"] for f in d["flows"])


def test_detects_bad_reference_and_negative():
    d = ds()
    d["flows"][0] = dict(d["flows"][0], recipient_id="nope", amount_mnok=-1)
    errs = validate.validate(d)
    assert any("ugyldig referanse" in e for e in errs) and any("negativt" in e for e in errs)


def test_live_mode_rejects_unverified_rows():
    d = ds()
    d["meta"] = dict(d["meta"], dataMode="live")
    assert any("uverifiserte" in e for e in validate.validate(d))


def test_verified_flow_requires_source_link():
    d = ds()
    d["flows"][0] = dict(d["flows"][0], verified=True, source_ref="MOCK")
    assert any("uten kildelenke" in e for e in validate.validate(d))


def test_manual_import_roundtrip(tmp_path):
    (tmp_path / "norad").mkdir()
    (tmp_path / "norad" / "a.csv").write_text(
        "year,recipient_id,category_id,amount_mnok,basis,source_id,source_ref\n2024,tza,dev,100.5,regnskap,norad,https://example.org/x\n")
    rows = manual_import.load(tmp_path)
    assert rows[0]["verified"] and rows[0]["amount_mnok"] == 100.5


def test_manual_import_requires_source_ref(tmp_path):
    (tmp_path / "x").mkdir()
    (tmp_path / "x" / "a.csv").write_text(
        "year,recipient_id,category_id,amount_mnok,basis,source_id,source_ref\n2024,tza,dev,1,regnskap,norad,\n")
    with pytest.raises(ValueError):
        manual_import.load(tmp_path)


STORTINGET_XML = """<?xml version="1.0" encoding="utf-8"?>
<saker_oversikt xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://data.stortinget.no"><saker_liste>
<sak><henvisning>Prop. 1 S (2025-2026), Innst. 17 S (2025-2026)</henvisning><id>104910</id><komite><id>UFK</id></komite>
<korttittel>Statsbudsjettet 2026</korttittel><sist_oppdatert_dato>2025-12-12T00:00:00</sist_oppdatert_dato><status>behandlet</status><tittel>Statsbudsjettet 2026</tittel></sak>
<sak><henvisning>Meld. St. 2 (2025-2026)</henvisning><id>200314</id><komite><id>FINANS</id></komite>
<korttittel>Revidert nasjonalbudsjett 2026</korttittel><sist_oppdatert_dato>2026-06-12T00:00:00</sist_oppdatert_dato><status>behandlet</status><tittel>Revidert nasjonalbudsjett 2026</tittel></sak>
<sak><henvisning>Prop. 7 L (2025-2026)</henvisning><id>1</id><komite><id>FINANS</id></komite>
<korttittel>Lov om noe</korttittel><sist_oppdatert_dato>2025-12-01T00:00:00</sist_oppdatert_dato><status>behandlet</status><tittel>Lov om noe (oppfølging av tiltak i forslaget til statsbudsjett)</tittel></sak>
</saker_liste></saker_oversikt>""".encode()


def test_stortinget_parse_and_classify():
    from pipeline.sources import stortinget
    cases = stortinget.parse_cases(STORTINGET_XML)
    assert [c["kind"] for c in cases] == ["revidert", "statsbudsjett"]
    assert cases[1]["url"].endswith("?p=104910") and cases[1]["date"] == "2025-12-12"
    assert [c["id"] for c in stortinget.foreign_budget_cases(cases)] == ["104910"]
    assert stortinget.session_id(2026) == "2025-2026"
