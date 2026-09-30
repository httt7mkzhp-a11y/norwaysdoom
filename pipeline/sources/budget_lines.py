"""Vedtatt statsbudsjett (kapittel/post/beløp) hentet fra Stortingets voteringsforslag.

Ved votering over budsjettinnstillingene (Innst. S på Prop. 1 S) publiserer data.stortinget.no komiteens tilråding
som HTML-tabeller («På statsbudsjettet for 2026 bevilges under: Kap. / Post / Formål / Kroner»). Når voteringen er
vedtatt (`vedtatt=true`), er tabellen det vedtatte budsjettet. Vi bruker bare `forslag_type == tilraading`
i voteringer som er vedtatt.

Hver rad får kildelenke (sak på stortinget.no), voteringsid og hentedato av kalleren.
"""
import re
from html.parser import HTMLParser

AMOUNT = re.compile(r"^-?\d{1,3}(?: \d{3})*$|^-?\d+$")


class _Tables(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self.sections: list[str] = []  # seksjonstekst (f.eks. «Utgifter»/«Inntekter») per rad
        self._row: list[str] | None = None
        self._cell: list[str] | None = None
        self._heading = ""
        self._para: list[str] | None = None
        self._cur_section = ""
        self._pre_text: list[str] = []
        self.intro: list[str] = []  # tekst før første tabell («På statsbudsjettet for 2026 bevilges under:»)

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._row = []
        elif tag == "td" and self._row is not None:
            self._cell = []
        elif tag == "p" and self._row is None:
            self._para = []

    def handle_endtag(self, tag):
        if tag == "td" and self._cell is not None and self._row is not None:
            self._row.append(re.sub(r"\s+", " ", "".join(self._cell)).strip())
            self._cell = None
        elif tag == "tr" and self._row is not None:
            if any(self._row):
                nonempty = [c for c in self._row if c]
                if len(nonempty) == 1 and nonempty[0] in ("Utgifter", "Inntekter"):
                    self._cur_section = nonempty[0]
                else:
                    self.rows.append(self._row)
                    self.sections.append(self._cur_section)
            self._row = None
        elif tag == "p" and self._para is not None:
            t = re.sub(r"\s+", " ", "".join(self._para)).strip()
            if t:
                self.intro.append(t)
            self._para = None

    def handle_data(self, data):
        if self._cell is not None:
            self._cell.append(data)
        elif self._para is not None:
            self._para.append(data)


def parse_amount(s: str) -> int | None:
    s = s.replace("\xa0", " ").replace("−", "-").strip()
    return int(s.replace(" ", "")) if s and AMOUNT.match(s) else None


def parse_budget_html(raw: str) -> list[dict]:
    """Rader: dict(section, chapter, chapter_name, post, name, amount_nok (post), chapter_total_nok). Beløp i hele kroner."""
    p = _Tables()
    p.feed(raw)
    out, chapter, chapter_name = [], None, ""
    for cells, section in zip(p.rows, p.sections):
        if len(cells) < 4 or cells[0].lower().startswith("kap") or not section:
            continue
        kap, post, name = cells[0], cells[1], cells[2]
        a1 = parse_amount(cells[3]) if len(cells) > 3 else None
        a2 = parse_amount(cells[4]) if len(cells) > 4 else None
        if kap and not post:  # kapittelrad, evt. med sum i siste kolonne
            chapter, chapter_name = kap, name
            if a1 is not None or a2 is not None:
                out.append(dict(section=section, chapter=kap, chapter_name=name, post=None, name=name, amount_nok=None, chapter_total_nok=a2 if a2 is not None else a1))
            continue
        if post and chapter and a1 is not None:
            out.append(dict(section=section, chapter=chapter, chapter_name=chapter_name, post=post, name=name, amount_nok=a1, chapter_total_nok=None))
    return out


def budget_year(raw: str) -> int | None:
    m = re.search(r"statsbudsjettet for (\d{4})", raw)
    return int(m.group(1)) if m else None
