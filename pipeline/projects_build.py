"""Bygger public/data/projects.json (kun godkjente poster) og data/review/queue/*.json (kandidater).

  python3 pipeline/projects_build.py

Feiler (og lar eksisterende public/data/projects.json stå) hvis en godkjent post mangler felt eller har et sitat
som ikke finnes på angitt side i kilden.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pipeline import projects  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    out = ROOT / "public" / "data" / "projects.json"
    try:
        data = projects.build_all()
    except Exception as e:  # noqa: BLE001
        print(f"FEIL: {e}\nEksisterende data er urørt.", file=sys.stderr)
        return 1
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(out)
    for p in data["projects"]:
        print(f"{p['id']}: {len(p['entries'])} godkjente poster, {p['queue']['n_pending']} kandidater venter, {p['queue']['n_documents']} dokumenter")
    return 0


if __name__ == "__main__":
    sys.exit(main())
