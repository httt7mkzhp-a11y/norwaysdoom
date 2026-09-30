"""Import av nedlastede/kuraterte data fra data/raw/<kilde>/*.csv.

Norad, OECD DAC, statsregnskapet, UD/FD og Gul bok har ikke et stabilt, verifisert åpent API vi kan
bruke uten nettverkstilgang til å teste. Analytiker laster ned og normaliserer til dette formatet:

  year,recipient_id,category_id,amount_mnok,basis,source_id,source_ref
  2024,tza,dev,1234.5,regnskap,norad,https://...   (source_ref = dypllenke/tabell/rad)

Alle importerte rader får verified=true. Se data/raw/README.md.
"""
import csv
from pathlib import Path

REQUIRED = ["year", "recipient_id", "category_id", "amount_mnok", "basis", "source_id", "source_ref"]


def load(raw_dir: Path) -> list[dict]:
    rows = []
    for f in sorted(raw_dir.glob("*/*.csv")):
        with f.open(newline="", encoding="utf-8") as fh:
            rd = csv.DictReader(fh)
            missing = [c for c in REQUIRED if c not in (rd.fieldnames or [])]
            if missing:
                raise ValueError(f"{f}: mangler kolonner {missing}")
            for i, r in enumerate(rd, start=2):
                if not r["source_ref"].strip():
                    raise ValueError(f"{f}:{i}: source_ref (kildelenke) er påkrevd")
                rows.append(dict(year=int(r["year"]), recipient_id=r["recipient_id"], category_id=r["category_id"],
                                 amount_mnok=round(float(r["amount_mnok"]), 2), basis=r["basis"],
                                 source_id=r["source_id"], source_ref=r["source_ref"], verified=True))
    return rows
