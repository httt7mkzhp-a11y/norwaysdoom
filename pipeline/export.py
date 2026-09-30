import csv
import json
from pathlib import Path

TABLES = {
    "sources": ["id", "name", "url", "publisher", "access", "license", "frequency", "automatic", "retrieved_at", "status"],
    "categories": ["id", "kind", "name_nb", "name_en", "description_nb", "description_en", "nature", "commitment", "commitment_note_nb", "commitment_note_en"],
    "recipients": ["id", "kind", "name_nb", "name_en", "iso_n3", "iso_a3", "region"],
    "flows": ["year", "recipient_id", "category_id", "amount_mnok", "amount_usd_m", "fx_nok_per_usd", "basis", "price_basis", "source_id", "source_ref", "retrieved_at", "verified"],
    "budgetLines": ["year", "chapter", "post", "name", "amount_nok", "amount_mnok", "category_id", "in_scope", "nature", "commitment", "basis", "price_basis", "source_id", "source_ref", "case_ref", "vote_id", "vote_time", "retrieved_at", "verified"],
    "projects": ["id", "year", "recipient_id", "category_id", "title_nb", "title_en", "purpose_nb", "purpose_en", "grantee", "amount_mnok", "source_id", "source_ref", "verified"],
    "yearStats": ["year", "population", "taxpayers", "gdp_mnok", "cpi_index", "price_basis", "source_id", "source_ref", "retrieved_at", "verified"],
    "unitCosts": ["id", "label_nb", "label_en", "unit_nb", "unit_en", "value_nok", "low_nok", "high_nok", "price_year", "source_id", "source_url", "verified"],
    "taxItems": ["id", "label_nb", "label_en", "revenue_mnok", "low_mnok", "high_mnok", "price_year", "note_nb", "note_en", "source_id", "source_url", "verified"],
}
CSV_NAMES = {"yearStats": "year_stats", "unitCosts": "unit_costs", "taxItems": "tax_items", "budgetLines": "budget_lines"}


def write(ds: dict, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    (out / "dataset.json").write_text(json.dumps(ds, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for key, cols in TABLES.items():
        with (out / f"{CSV_NAMES.get(key, key)}.csv").open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
            w.writeheader()
            w.writerows(ds.get(key, []))
