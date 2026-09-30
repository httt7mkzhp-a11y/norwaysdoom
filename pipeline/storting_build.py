"""Bygger public/data/storting/ fra data.stortinget.no.

  python3 pipeline/storting_build.py [--out public/data/storting] [--max-drop 0.05]

Filer:
  index.json           meta, partier, komiteer, områder, saker og voteringer (med partisummer)
  reps.json            representant-id -> navn, parti, fylke
  votes-<sesjon>.json  voteringsid -> {representant-id: f|m|a}   (f=for, m=mot, a=ikke til stede)

Skriver til en midlertidig mappe, validerer, og bytter først ved suksess. Ved feil eller stort avvik mot forrige
uttrekk avsluttes prosessen med feilkode og eksisterende filer røres ikke.
"""
import argparse
import json
import shutil
import sys
import tempfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pipeline.sources import stortinget as st  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "pipeline" / "config" / "storting.json"
SOURCE_URL = "https://data.stortinget.no/"


def party_sums(results: dict[str, str], reps: dict[str, dict]) -> dict[str, list[int]]:
    out: dict[str, list[int]] = defaultdict(lambda: [0, 0, 0])
    for rid, code in results.items():
        out[reps[rid]["party"]]["fma".index(code)] += 1
    return dict(out)


def validate_vote(v: dict, results: dict[str, str] | None, sums: dict | None) -> list[str]:
    errs = []
    if v["personal"]:
        if results is None or sums is None:
            return [f"votering {v['id']}: personlig votering uten resultater"]
        tot = [sum(s[i] for s in sums.values()) for i in range(3)]
        if tot != [v["n_for"], v["n_against"], v["n_absent"]]:
            errs.append(f"votering {v['id']}: partisum {tot} != oppgitt {[v['n_for'], v['n_against'], v['n_absent']]}")
        if len(results) != sum(tot):
            errs.append(f"votering {v['id']}: {len(results)} representanter != {sum(tot)}")
    return errs


def project_case_areas() -> dict[str, str]:
    """Saker der prosjektpipelinen fant kandidattall (data/review/queue) -> områdeid. Kobler kostnadsutvikling til voteringer."""
    out = {}
    for f in sorted((ROOT / "data" / "review" / "queue").glob("*.json")):
        q = json.loads(f.read_text(encoding="utf-8"))
        area = json.loads((ROOT / "pipeline" / "config" / "projects.json").read_text(encoding="utf-8"))
        aid = next((p["storting_area"] for p in area["projects"] if p["id"] == q["project_id"]), None)
        if aid:
            out.update({d["case_id"]: aid for d in q["documents"] if d["n_candidates"] > 0})
    return out


def collect(cfg: dict, log=print) -> tuple[dict, dict, dict[str, dict]]:
    areas = cfg["areas"]
    linked = project_case_areas()
    cases: dict[str, dict] = {}
    for sess in cfg["sessions"]:
        for c in st.budget_cases(sess, areas, linked):
            cases[c["id"]] = c
    for sess in cfg.get("history_sessions_for_areas", []):
        for c in st.budget_cases(sess, areas, linked):
            if c["areas"]:
                cases.setdefault(c["id"], c)
    log(f"{len(cases)} saker")

    votes, reps, rep_votes, errors = [], {}, defaultdict(dict), []
    for n, c in enumerate(cases.values(), 1):
        for v in st.votes_for_case(c["id"]):
            v["session"] = c["session"]
            results = sums = None
            if v["personal"]:
                results, r = st.results_for_vote(v["id"])
                reps.update(r)
                sums = party_sums(results, reps)
                rep_votes[c["session"]][v["id"]] = results
            errors += validate_vote(v, results, sums)
            props = st.proposals_for_vote(v["id"])
            v["parties"] = sums
            v["proposals"] = props
            v["areas"] = sorted(set(c["areas"]) | set(st.tag_areas(" ".join([v["theme"]] + [p["text"] for p in props]), areas)))
            votes.append(v)
        if n % 10 == 0:
            log(f"  {n}/{len(cases)} saker, {len(votes)} voteringer")
    if errors:
        raise ValueError("validering feilet:\n  " + "\n  ".join(errors[:20]))

    for c in cases.values():
        cv = [v for v in votes if v["case_id"] == c["id"]]
        c["n_votes"] = len(cv)
        c["areas"] = sorted(set(c["areas"]) | {a for v in cv for a in v["areas"]})
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    sess = cfg["sessions"][-1]
    index = dict(
        meta=dict(source="Stortingets åpne data", source_url=SOURCE_URL, license="NLOD 2.0", retrieved_at=now,
                  sessions=cfg["sessions"], history_sessions_for_areas=cfg.get("history_sessions_for_areas", []),
                  n_cases=len(cases), n_votes=len(votes), n_personal_votes=sum(v["personal"] for v in votes),
                  note_nb="Voteringer uten registrerte stemmer per representant (f.eks. enstemmig vedtatt) har ikke parti- eller representantoppdeling."),
        parties=st.parties(sess), committees=st.committees(sess), areas=areas,
        cases=sorted(cases.values(), key=lambda c: (c["date"], c["id"]), reverse=True),
        votes=sorted(votes, key=lambda v: (v["time"], v["id"]), reverse=True))
    return index, reps, rep_votes


def check_drift(new: dict, old_path: Path, max_drop: float) -> None:
    if not old_path.exists():
        return
    old = json.loads(old_path.read_text(encoding="utf-8"))["meta"]
    for key in ("n_cases", "n_votes"):
        if old[key] and new["meta"][key] < old[key] * (1 - max_drop):
            raise ValueError(f"stort avvik: {key} {old[key]} -> {new['meta'][key]} (>{max_drop:.0%} nedgang)")


def write(out: Path, index: dict, reps: dict, rep_votes: dict) -> None:
    tmp = Path(tempfile.mkdtemp(prefix="storting-", dir=out.parent))
    try:
        dump = lambda p, o: p.write_text(json.dumps(o, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")  # noqa: E731
        dump(tmp / "index.json", index)
        dump(tmp / "reps.json", reps)
        for sess, vv in rep_votes.items():
            dump(tmp / f"votes-{sess}.json", vv)
        if out.exists():
            shutil.rmtree(out)
        tmp.rename(out)
    except BaseException:
        shutil.rmtree(tmp, ignore_errors=True)
        raise


def build(out: Path, max_drop: float = 0.05, log=print) -> dict:
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    index, reps, rep_votes = collect(cfg, log)
    check_drift(index, out / "index.json", max_drop)
    out.parent.mkdir(parents=True, exist_ok=True)
    write(out, index, reps, rep_votes)
    return index["meta"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "public" / "data" / "storting"))
    ap.add_argument("--max-drop", type=float, default=0.05)
    a = ap.parse_args()
    try:
        meta = build(Path(a.out), a.max_drop)
    except Exception as e:  # noqa: BLE001
        print(f"FEIL: {e}\nEksisterende data er urørt.", file=sys.stderr)
        return 1
    print(json.dumps(meta, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
