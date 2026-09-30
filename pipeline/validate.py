"""Validerer dataset. Exit-kode != 0 ved feil (brukes i CI og før commit av oppdaterte data)."""
import json
import sys
from collections import defaultdict
from pathlib import Path


def validate(ds: dict) -> list[str]:
    errs = []
    ids = lambda k: {r["id"] for r in ds[k]}
    src, cat, rec = ids("sources"), ids("categories"), ids("recipients")
    seen = set()
    sums = defaultdict(float)
    for f in ds["flows"]:
        k = (f["year"], f["recipient_id"], f["category_id"])
        if k in seen:
            errs.append(f"duplikat flow {k}")
        seen.add(k)
        if f["amount_mnok"] < 0:
            errs.append(f"negativt beløp {k}")
        if f["recipient_id"] not in rec or f["category_id"] not in cat or f["source_id"] not in src:
            errs.append(f"ugyldig referanse i flow {k}")
        if f["basis"] not in ("vedtatt", "regnskap", "estimat"):
            errs.append(f"ugyldig basis {k}")
        if f["verified"] and not str(f.get("source_ref", "")).startswith("http"):
            errs.append(f"verifisert flow uten kildelenke {k}")
        sums[k] += f["amount_mnok"]
    psum = defaultdict(float)
    for p in ds["projects"]:
        k = (p["year"], p["recipient_id"], p["category_id"])
        psum[k] += p["amount_mnok"]
        if p["source_id"] not in src:
            errs.append(f"ukjent kilde i prosjekt {p['id']}")
    for k, v in psum.items():
        if v > sums.get(k, 0) + 0.05:
            errs.append(f"prosjekter {k} ({v:.1f}) overstiger flow ({sums.get(k, 0):.1f})")
    for r in ds["recipients"]:
        if r["kind"] == "country" and not r.get("iso_n3"):
            errs.append(f"land uten iso_n3: {r['id']}")
    years = {y["year"] for y in ds["yearStats"]}
    for y in {f["year"] for f in ds["flows"]}:
        if y not in years:
            errs.append(f"mangler yearStats for {y}")
    for u in ds["unitCosts"]:
        if not (u["low_nok"] <= u["value_nok"] <= u["high_nok"]) or not u["source_url"]:
            errs.append(f"unitCost {u['id']}: ugyldig intervall eller mangler kilde")
    for t in ds["taxItems"]:
        if not (t["low_mnok"] <= t["revenue_mnok"] <= t["high_mnok"]) or not t["source_url"]:
            errs.append(f"taxItem {t['id']}: ugyldig intervall eller mangler kilde")
    allrows = ds["flows"] + ds["projects"] + ds["unitCosts"] + ds["taxItems"] + ds["yearStats"]
    anyunver = any(not r["verified"] for r in allrows)
    mode = ds["meta"]["dataMode"]
    if mode == "live" and anyunver:
        errs.append("dataMode=live men uverifiserte rader finnes")
    if mode in ("mock", "partial") and not anyunver:
        errs.append(f"dataMode={mode} men alle rader er verifisert")
    if mode == "partial" and not any(r["verified"] for r in allrows):
        errs.append("dataMode=partial men ingen verifiserte rader")
    if mode == "mock" and any(r["verified"] for r in allrows):
        errs.append("dataMode=mock men verifiserte rader finnes")
    return errs


if __name__ == "__main__":
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "public/data/dataset.json")
    errors = validate(json.loads(path.read_text(encoding="utf-8")))
    for e in errors[:50]:
        print("FEIL:", e)
    print(f"{len(errors)} feil" if errors else "OK")
    sys.exit(1 if errors else 0)
