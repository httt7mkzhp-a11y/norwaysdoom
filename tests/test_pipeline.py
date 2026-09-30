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
