import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline import budget, real_data, validate  # noqa: E402
from pipeline.sources import budget_lines as bl  # noqa: E402
from pipeline.sources import oecd_dac, ssb  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def test_cpi_annual_average_needs_twelve_months():
    m = {f"2024M{i:02d}": 100.0 + i for i in range(1, 13)}
    m.update({f"2025M{i:02d}": 200.0 for i in range(1, 8)})
    r = ssb.cpi_annual_average(m)
    assert set(r) == {2024} and r[2024] == pytest.approx(106.5)


def test_jsonstat_by_time_requires_single_other_dimension():
    js = {"id": ["Region", "Tid"], "size": [1, 2], "dimension": {"Tid": {"category": {"index": {"2024": 0, "2025": 1}}}}, "value": [5, 6]}
    assert ssb.parse_jsonstat_by_time(js) == {"2024": 5, "2025": 6}
    with pytest.raises(ValueError):
        ssb.parse_jsonstat_by_time(dict(js, size=[2, 2]))


DAC2 = [dict(MEASURE="206", UNIT_MEASURE="USD", PRICE_BASE="V", OBS_VALUE=v, TIME_PERIOD="2023", RECIPIENT=r) for r, v in
        [("TZA", "100"), ("UKR", "300"), ("DPGC", "1000"), ("ALLR", "1500"), ("KGZ", "-1")]]
D1 = lambda unit, k: [dict(FLOW_TYPE="1140", PRICE_BASE="V", OBS_VALUE=str(v * k), TIME_PERIOD="2023", MEASURE=m) for m, v in [("1010", 1500), ("1015", 1000), ("2000", 500), ("1820", 200)]]  # noqa: E731


def dac():
    nok, usd = oecd_dac.parse_dac1(D1("XDC", 10)), oecd_dac.parse_dac1(D1("USD", 1))
    return dict(dac2a_usd=oecd_dac.parse_dac2a(DAC2), dac1_nok=nok, dac1_usd=usd, rates=oecd_dac.implied_rates(nok, usd), urls=dict(dac2a="https://a", dac1_nok="https://b", dac1_usd="https://c"))


def test_implied_rate_is_total_nok_over_total_usd():
    assert dac()["rates"] == {2023: 10.0}


def test_flows_convert_usd_to_nok_and_sums_match_dac1_total():
    flows, recips, problems, notes = real_data.build_flows(dac(), "2026-01-01T00:00:00+00:00")
    assert problems == [] and len(notes) == 1  # KGZ negativ utelatt
    by = {(f["recipient_id"], f["category_id"]): f["amount_mnok"] for f in flows}
    assert by[("tza", "oda_bilat")] == 1000 and by[("ukr", "oda_bilat")] == 3000
    assert by[("unallocated", "oda_bilat")] == pytest.approx(4010)  # DPGC 1000 - land 399 - flyktninger 200, i USD, x 10
    assert by[("multilateral", "oda_multi")] == 5000 and by[("norway_refugees", "oda_refugee")] == 2000
    assert abs(sum(by.values()) - 15000) < 30 and all(f["source_ref"].startswith("https://") and f["retrieved_at"] for f in flows)
    assert {"tza", "ukr"} <= set(recips)


def test_flows_flag_inconsistent_totals():
    d = dac()
    d["dac1_nok"][2023]["1010"] = 99999
    d["rates"] = oecd_dac.implied_rates(d["dac1_nok"], d["dac1_usd"])
    assert build_problems(d)


def build_problems(d):
    return real_data.build_flows(d, "x")[2]


HTML = """<div><p>På statsbudsjettet for 2026 bevilges under:</p><table><tbody>
<tr><td colspan='5'><p>Utgifter</p></td></tr>
<tr><td><p>159</p></td><td></td><td><p>Regionbevilgninger</p></td><td></td><td></td></tr>
<tr><td></td><td><p>73</p></td><td><p>Ukraina og naboland, kan overføres</p></td><td><p>14 413 100 000</p></td><td></td></tr>
<tr><td></td><td><p>75</p></td><td><p>Afrika, kan overføres</p></td><td><p>1 859 022 000</p></td><td></td></tr>
<tr><td><p>179</p></td><td></td><td><p>Flyktningtiltak i Norge</p></td><td></td><td></td></tr>
<tr><td></td><td><p>21</p></td><td><p>Spesielle driftsutgifter</p></td><td><p>2 703 135 000</p></td><td></td></tr>
<tr><td colspan='5'><p>Inntekter</p></td></tr>
<tr><td><p>3100</p></td><td></td><td><p>UD</p></td><td></td><td></td></tr>
<tr><td></td><td><p>1</p></td><td><p>Gebyrer</p></td><td><p>33 344 000</p></td><td></td></tr></tbody></table></div>"""


def rows(year=2026, html=HTML):
    return [dict(budget_year=year, **{k: r[k] for k in ("chapter", "chapter_name", "post", "name", "amount_nok")}) for r in bl.parse_budget_html(html) if r["section"] == "Utgifter"]


def test_budget_table_parsing():
    assert bl.budget_year(HTML) == 2026
    r = rows()
    assert [(x["chapter"], x["post"], x["amount_nok"]) for x in r] == [("159", "73", 14413100000), ("159", "75", 1859022000), ("179", "21", 2703135000)]


def test_budget_classification_and_totals():
    d = budget.load_definition()
    res = budget.classify_all(rows(), d)
    t = budget.totals(res)
    assert t[2026] == {"ukr": 14413100000, "dev": 1859022000}
    assert not [r for r in res if r["chapter"] == "179"][0]["in_scope"]


def test_budget_rule_expectation_guard_and_unclassified_chapters():
    d = budget.load_definition()
    with pytest.raises(ValueError, match="forventer"):
        budget.classify_all(rows(html=HTML.replace("Ukraina og naboland", "Noe helt annet")), d)
    with pytest.raises(ValueError, match="ikke klassifisert"):
        budget.classify_all([dict(budget_year=2026, chapter="168", chapter_name="X", post="70", name="Ny post", amount_nok=1)], d)


def small_ds():
    now = "2026-01-01T00:00:00+00:00"
    line = dict(year=2026, chapter="159", post="73", name="Ukraina", chapter_name="X", amount_mnok=1.0, amount_nok=1_000_000, category_id="ukr", in_scope=True, nature="grant", commitment="political",
                basis="vedtatt", price_basis="løpende", source_id="stortinget", source_ref="https://www.stortinget.no/x", case_ref="Prop. 1 S", vote_id="1", vote_time="2025-12-19", verified=True, retrieved_at=now)
    flow = dict(year=2026, recipient_id="tza", category_id="oda_bilat", amount_mnok=1.0, basis="regnskap", source_id="oecd_dac", source_ref="https://a", verified=True, retrieved_at=now)
    return dict(meta=dict(dataMode="partial", unavailable=[{"id": "x"}]), sources=[dict(id="stortinget"), dict(id="oecd_dac")], categories=[dict(id="ukr"), dict(id="oda_bilat")],
                recipients=[dict(id="tza", kind="country", iso_n3=834)], flows=[flow], budgetLines=[line], projects=[], unitCosts=[], taxItems=[],
                yearStats=[dict(year=2026, population=1, taxpayers=None, gdp_mnok=None, cpi_index=None, verified=True)])


def test_validate_accepts_small_real_dataset():
    assert validate.validate(small_ds()) == []


def test_validate_requires_source_and_retrieval_date():
    d = small_ds()
    d["flows"][0].pop("retrieved_at")
    d["budgetLines"][0]["source_ref"] = ""
    errs = validate.validate(d)
    assert any("hentedato" in e for e in errs) and any("kildelenke, hentedato" in e for e in errs)


def test_published_dataset_rows_have_source_and_date():
    p = ROOT / "public/data/dataset.json"
    ds = json.loads(p.read_text(encoding="utf-8"))
    if ds["meta"]["dataMode"] == "mock":
        pytest.skip("mock")
    for key in ("flows", "budgetLines", "yearStats"):
        for r in ds[key]:
            assert r["retrieved_at"] and (r.get("source_ref") or "").startswith("http"), (key, r)
            assert r["verified"] is True
    assert ds["meta"]["unavailable"]


def test_preliminary_year_uses_dac1_totals_when_country_split_missing():
    d = dac()
    d["dac1_nok"][2025] = {"1010": 1500.0, "1015": 1000.0, "2000": 500.0, "1820": 200.0}
    d["dac1_usd"][2025] = {"1010": 150.0, "1015": 100.0, "2000": 50.0, "1820": 20.0}
    d["rates"] = oecd_dac.implied_rates(d["dac1_nok"], d["dac1_usd"])
    flows, _, problems, notes = real_data.build_flows(d, "x")
    p = {(f["recipient_id"], f["category_id"]): f for f in flows if f["year"] == 2025}
    assert problems == [] and all(f["preliminary"] for f in p.values())
    assert p[("unallocated", "oda_bilat")]["amount_mnok"] == 800 and p[("multilateral", "oda_multi")]["amount_mnok"] == 500 and p[("norway_refugees", "oda_refugee")]["amount_mnok"] == 200
    assert any("2025" in n for n in notes)
