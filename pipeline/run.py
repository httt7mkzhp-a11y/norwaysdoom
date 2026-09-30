"""Kjør pipeline.

  python3 pipeline/run.py --mode mock   # regenererer illustrativt demodatasett
  python3 pipeline/run.py --mode live   # henter fra kilder, faller tilbake til mock per hull, logger status

Live-modus er aldri stille: hver kilde får status live/failed/manual_needed/mock i dataset.meta og sources[].
"""
import argparse
import json
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pipeline import export, mock_data, validate  # noqa: E402
from pipeline.sources import manual_import, ssb, stortinget  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def run_live(ds: dict, now: str) -> dict:
    log = {}
    status = {s["id"]: s for s in ds["sources"]}

    def mark(sid, st, msg=""):
        status[sid]["status"] = st
        if st == "live":
            status[sid]["retrieved_at"] = now
        log[sid] = f"{st} {msg}".strip()

    # 1) SSB: befolkning, BNP, KPI
    years = [y["year"] for y in ds["yearStats"]]
    try:
        pop = ssb.fetch_year_series("population", years)
        gdp = ssb.fetch_year_series("gdp", years)
        cpi = ssb.fetch_year_series("cpi", years)
        base = cpi.get(max(cpi))
        for ys in ds["yearStats"]:
            y = ys["year"]
            if y in pop and y in gdp and y in cpi:
                ys.update(population=int(pop[y]), gdp_mnok=float(gdp[y]), cpi_index=round(base / cpi[y], 4))
                # skattytere hentes ikke automatisk -> forblir mock, derfor verified=False
        mark("ssb", "live", "befolkning/BNP/KPI (skattytere: manuell)")
    except Exception as e:  # noqa: BLE001
        mark("ssb", "failed", repr(e))
        traceback.print_exc()

    # 2) Stortinget: kun referanse/ping
    try:
        cases = stortinget.budget_cases(f"{ds['meta']['currentYear'] - 1}-{ds['meta']['currentYear']}")
        mark("stortinget", "live", f"{len(cases)} budsjettsaker funnet")
    except Exception as e:  # noqa: BLE001
        mark("stortinget", "failed", repr(e))

    # 3) Manuell import av flow-rader (Norad/OECD/statsregnskap/UD/FD/Gul bok)
    try:
        rows = manual_import.load(ROOT / "data" / "raw")
    except Exception as e:  # noqa: BLE001
        rows = []
        log["manual_import"] = f"failed {e!r}"
    if rows:
        replaced = {(r["year"], r["category_id"]) for r in rows}
        ds["flows"] = [f for f in ds["flows"] if (f["year"], f["category_id"]) not in replaced] + rows
        ds["projects"] = [p for p in ds["projects"] if (p["year"], p["category_id"]) not in replaced]
        for sid in {r["source_id"] for r in rows}:
            mark(sid, "live", f"manuell import, {sum(1 for r in rows if r['source_id'] == sid)} rader")
    for sid, s in status.items():
        if sid not in log:
            mark(sid, "manual_needed" if s["access"] in ("manual", "download") else "failed", "ingen data hentet")
    ds["flows"].sort(key=lambda f: (f["year"], f["category_id"], f["recipient_id"]))
    ds["meta"]["pipelineLog"] = log
    allrows = ds["flows"] + ds["projects"] + ds["unitCosts"] + ds["taxItems"] + ds["yearStats"]
    anyunver = any(not r["verified"] for r in allrows)
    anyver = any(r["verified"] for r in allrows)
    ds["meta"]["dataMode"] = "live" if not anyunver else ("partial" if anyver else "mock")
    if anyver:
        ds["meta"]["lastSuccessfulLiveUpdate"] = now
    if ds["meta"]["dataMode"] == "partial":
        ds["meta"]["notice_nb"] = "DELVIS DEMO: deler av datasettet er verifisert mot kilder, resten er illustrative eksempeldata (merket per rad)."
        ds["meta"]["notice_en"] = "PARTIAL DEMO: parts of the dataset are verified against sources; the rest is illustrative sample data (flagged per row)."
    return ds


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["mock", "live"], default="mock")
    ap.add_argument("--out", default=str(ROOT / "public" / "data"))
    a = ap.parse_args()
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    ds = mock_data.generate(now)
    if a.mode == "live":
        ds = run_live(ds, now)
    errs = validate.validate(ds)
    if errs:
        print("Validering feilet:\n  " + "\n  ".join(errs[:30]))
        return 1
    export.write(ds, Path(a.out))
    print(f"Skrev {a.out} (dataMode={ds['meta']['dataMode']}, flows={len(ds['flows'])}, projects={len(ds['projects'])})")
    if a.mode == "live":
        print(json.dumps(ds["meta"].get("pipelineLog", {}), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
