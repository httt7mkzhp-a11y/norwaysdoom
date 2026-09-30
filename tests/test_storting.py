import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline import net, storting_build  # noqa: E402
from pipeline.sources import stortinget as st  # noqa: E402

NSDECL = 'xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://data.stortinget.no"'
AREAS = json.loads((Path(__file__).resolve().parent.parent / "pipeline/config/storting.json").read_text())["areas"]


def rep(i, party, vote):
    return (f"<representant_voteringsresultat><representant><etternavn>Navn{i}</etternavn><fornavn>Ola</fornavn><id>R{i}</id>"
            f"<fylke><navn>Oslo</navn></fylke><parti><id>{party}</id><navn>Parti {party}</navn></parti></representant><votering>{vote}</votering></representant_voteringsresultat>")


RESULT = ET.fromstring(f"<o {NSDECL}><voteringsresultat_liste>{rep(1, 'A', 'for')}{rep(2, 'A', 'mot')}{rep(3, 'H', 'ikke_tilstede')}</voteringsresultat_liste></o>")
VOTES = ET.fromstring(f"""<o {NSDECL}><sak_votering_liste><sak_votering><votering_id>9</votering_id><votering_tid>2026-06-19T12:17:38.883</votering_tid>
<votering_tema>Forslag nr. 56 på vegne av KrF.</votering_tema><behandlingsrekkefoelge>1</behandlingsrekkefoelge><dagsorden_sak_nummer>1</dagsorden_sak_nummer>
<vedtatt>false</vedtatt><votering_resultat_type>ikke_spesifisert</votering_resultat_type><votering_resultat_type_tekst/><personlig_votering>true</personlig_votering>
<antall_for>1</antall_for><antall_mot>1</antall_mot><antall_ikke_tilstede>1</antall_ikke_tilstede></sak_votering></sak_votering_liste></o>""")
PROPS = ET.fromstring(f"""<o {NSDECL}><voteringsforslag_liste><voteringsforslag><forslag_betegnelse>Forslag nr. 56</forslag_betegnelse><forslag_betegnelse_kort>nr. 56</forslag_betegnelse_kort>
<forslag_levert_av_parti_liste><parti><id>KrF</id></parti></forslag_levert_av_parti_liste><forslag_paa_vegne_av_tekst>Kristelig Folkeparti:</forslag_paa_vegne_av_tekst>
<forslag_tekst>&lt;p&gt;Stortinget ber   regjeringen &amp;amp; mer&lt;/p&gt;</forslag_tekst><forslag_type>loest_forslag</forslag_type></voteringsforslag></voteringsforslag_liste></o>""")


def test_parse_votes_and_results():
    v = st.parse_votes(VOTES, "1")[0]
    assert (v["id"], v["n_for"], v["n_against"], v["n_absent"], v["personal"], v["adopted"]) == ("9", 1, 1, 1, True, False)
    results, reps = st.parse_results(RESULT)
    assert results == {"R1": "f", "R2": "m", "R3": "a"} and reps["R1"]["party"] == "A" and reps["R1"]["county"] == "Oslo"
    sums = storting_build.party_sums(results, reps)
    assert sums == {"A": [1, 1, 0], "H": [0, 0, 1]}
    assert storting_build.validate_vote(v, results, sums) == []


def test_validation_detects_sum_mismatch():
    v = dict(st.parse_votes(VOTES, "1")[0], n_for=5)
    results, reps = st.parse_results(RESULT)
    assert any("partisum" in e for e in storting_build.validate_vote(v, results, storting_build.party_sums(results, reps)))


def test_unknown_vote_value_is_error():
    bad = ET.fromstring(f"<o {NSDECL}><l>{rep(1, 'A', 'kanskje')}</l></o>")
    with pytest.raises(ValueError):
        st.parse_results(bad)


def test_proposals_are_plain_text():
    p = st.parse_proposals(PROPS)[0]
    assert p["text"] == "Stortinget ber regjeringen & mer" and p["by_parties"] == ["KrF"]


def test_area_tagging_uses_word_start():
    assert st.tag_areas("Bevilgning til Follobanen", AREAS) == ["follobanen"]
    assert "internasjonalt" in st.tag_areas("Norges bidrag til NATO", AREAS)
    assert st.tag_areas("Senatorenes rolle", AREAS) == []
    assert "bistand" in st.tag_areas("Om bistandsbudsjettet", AREAS)


def test_drift_check_blocks_large_drop(tmp_path):
    (tmp_path / "index.json").write_text(json.dumps({"meta": {"n_cases": 100, "n_votes": 1000}}))
    with pytest.raises(ValueError):
        storting_build.check_drift({"meta": {"n_cases": 100, "n_votes": 500}}, tmp_path / "index.json", 0.05)
    storting_build.check_drift({"meta": {"n_cases": 100, "n_votes": 990}}, tmp_path / "index.json", 0.05)


def test_write_is_atomic_and_keeps_old_data_on_failure(tmp_path):
    out = tmp_path / "storting"
    storting_build.write(out, {"a": 1}, {}, {"2025-2026": {"9": {"R1": "f"}}})
    assert json.loads((out / "index.json").read_text()) == {"a": 1} and (out / "votes-2025-2026.json").exists()
    with pytest.raises(TypeError):
        storting_build.write(out, {"a": object()}, {}, {})
    assert json.loads((out / "index.json").read_text()) == {"a": 1}
    assert not [p for p in tmp_path.iterdir() if p.name.startswith("storting-")]


def test_cached_get_uses_cache(tmp_path, monkeypatch):
    calls = []
    monkeypatch.setattr(net, "get", lambda url, **k: calls.append(url) or b"x")
    assert net.cached_get("http://e/1", 1, tmp_path) == b"x" and net.cached_get("http://e/1", 1, tmp_path) == b"x"
    assert len(calls) == 1


def test_published_index_has_source_and_retrieval_date():
    p = Path(__file__).resolve().parent.parent / "public/data/storting/index.json"
    if not p.exists():
        pytest.skip("ingen publisert storting-indeks")
    d = json.loads(p.read_text(encoding="utf-8"))
    assert d["meta"]["source_url"].startswith("https://") and d["meta"]["retrieved_at"]
    assert all(c["url"].startswith("https://www.stortinget.no/") and c["reference"] for c in d["cases"])
    ids = {c["id"] for c in d["cases"]}
    for v in d["votes"]:
        assert v["case_id"] in ids
        if v["personal"]:
            tot = [sum(s[i] for s in v["parties"].values()) for i in range(3)]
            assert tot == [v["n_for"], v["n_against"], v["n_absent"]]
