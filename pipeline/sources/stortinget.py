"""Stortingets åpne data (data.stortinget.no, XML).

STATUS: UTESTET. Brukes til å finne budsjettsaker (referanser for kildelenker/vedtaksdato).
Beløp per mottaker står i Gul bok/Prop. 1 S (PDF/HTML) og dekkes av manuell import.
"""
import xml.etree.ElementTree as ET

from ..net import get

BASE = "https://data.stortinget.no/eksport/"


def budget_cases(session_id: str) -> list[dict]:
    root = ET.fromstring(get(f"{BASE}saker?sesjonid={session_id}"))
    out = []
    for el in root.iter():
        if el.tag.endswith("sak"):
            g = {c.tag.split("}")[-1]: (c.text or "") for c in el}
            title = g.get("tittel", "") + " " + g.get("korttittel", "")
            if "budsjett" in title.lower():
                out.append(dict(id=g.get("id"), title=g.get("korttittel") or g.get("tittel"),
                                url=f"https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p={g.get('id')}"))
    return out
