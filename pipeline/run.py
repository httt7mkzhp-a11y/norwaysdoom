"""Kjør pipeline.

  python3 pipeline/run.py                 # henter ekte data (Stortinget, SSB, OECD DAC) og skriver public/data
  python3 pipeline/run.py --mode mock --out /tmp/mock   # illustrativt testdatasett (aldri til public/data)

Hele kjøringen er alt-eller-ingenting: ved feil, valideringsfeil eller stort avvik mot forrige uttrekk avsluttes prosessen
med feilkode, og eksisterende filer i public/data overskrives ikke.
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pipeline import export, mock_data, real_data, storting_build, validate  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SESSIONS = ["2024-2025", "2025-2026"]  # budsjettår 2025 og 2026
MAX_DROP = 0.10


def check_drift(new: dict, old_path: Path) -> list[str]:
    """Sammenlign med forrige uttrekk: antall rader og årssummer må ikke avvike mye uten at det er bevisst."""
    if not old_path.exists():
        return []
    old = json.loads(old_path.read_text(encoding="utf-8"))
    if old.get("meta", {}).get("dataMode") == "mock":
        return []
    errs = []
    for key in ("flows", "budgetLines", "yearStats"):
        o, n = len(old.get(key, [])), len(new.get(key, []))
        if o and n < o * (1 - MAX_DROP):
            errs.append(f"{key}: {o} -> {n} rader (mer enn {MAX_DROP:.0%} nedgang)")

    def totals(ds, key, field):
        t = {}
        for r in ds.get(key, []):
            if r.get("in_scope", True):
                t[r["year"]] = t.get(r["year"], 0) + r[field]
        return t
    for key in ("flows", "budgetLines"):
        o, n = totals(old, key, "amount_mnok"), totals(new, key, "amount_mnok")
        for y in set(o) & set(n):
            if o[y] and abs(n[y] - o[y]) / o[y] > 0.25:
                errs.append(f"{key} {y}: sum {o[y]:.0f} -> {n[y]:.0f} mill. NOK (>25 % avvik). Kontroller kilden; godkjenn med --accept-drift")
    return errs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["real", "mock"], default="real")
    ap.add_argument("--out", default=None)
    ap.add_argument("--accept-drift", action="store_true", help="tillat store avvik mot forrige uttrekk (etter manuell kontroll)")
    a = ap.parse_args()
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    if a.mode == "mock":
        if not a.out:
            print("--mode mock krever --out (mockdata skal aldri skrives til public/data)")
            return 2
        ds = mock_data.generate(now)
        out = Path(a.out)
    else:
        out = Path(a.out or ROOT / "public" / "data")
        try:
            ds = real_data.build(SESSIONS)
        except Exception as e:  # noqa: BLE001
            print(f"FEIL ved henting: {e}\nEksisterende data er urørt.", file=sys.stderr)
            return 1
    errs = validate.validate(ds)
    if a.mode == "real" and not a.accept_drift:
        errs += check_drift(ds, out / "dataset.json")
    if errs:
        print("Validering feilet:\n  " + "\n  ".join(errs[:30]), file=sys.stderr)
        return 1
    if a.mode == "real":
        try:
            meta = storting_build.build(out / "storting", max_drop=1.0 if a.accept_drift else 0.05)
        except Exception as e:  # noqa: BLE001
            print(f"FEIL ved Stortinget-bygg: {e}\nEksisterende data er urørt.", file=sys.stderr)
            return 1
        ds["meta"]["storting"] = meta
        for s in ds["sources"]:
            if s["id"] == "stortinget":
                s["retrieved_at"] = meta["retrieved_at"]
    export.write(ds, out)
    print(f"Skrev {out} (dataMode={ds['meta']['dataMode']}, flows={len(ds['flows'])}, budgetLines={len(ds.get('budgetLines', []))})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
