"""Bygger det publiserte datasettet fra kilder (ingen mockdata).

Hver rad har kilde-URL (source_ref), hentedato (retrieved_at), år, beløpstype (basis) og prisgrunnlag (price_basis).
Det som ikke lar seg hente står i meta.unavailable (vises på siden og i docs/datahull.md). Ingenting estimeres.
"""
from datetime import datetime, timezone

import pycountry
from babel import Locale

from . import budget
from .sources import oecd_dac, ssb

NB, EN = Locale("nb"), Locale("en")

COMMITMENT_NOTE = {
    "political": ("Vedtatt i statsbudsjettet uten ekstern folkerettslig binding (etter postens ordlyd).", "Adopted in the state budget without external treaty obligation (by the wording of the item)."),
    "agreement": ("Følger av avtale (finansieringsordninger under EØS-avtalen). Klassifisert manuelt.", "Follows from an agreement (financing mechanisms under the EEA Agreement). Classified manually."),
    "treaty": ("Medlemskap i internasjonal organisasjon (NATO). Klassifisert manuelt.", "Membership of an international organisation (NATO). Classified manually."),
    "obligatory": ("Pliktige bidrag (postens navn). Klassifisert manuelt.", "Assessed contributions (name of the item). Classified manually."),
}

ODA_CATEGORIES = [
    dict(id="oda_bilat", kind="oda", name_nb="Bilateral bistand (ODA), utbetalt", name_en="Bilateral aid (ODA), disbursed", nature="grant", commitment="political",
         description_nb="OECD DAC: netto utbetalinger av bilateral ODA fordelt på mottakerland, unntatt flyktningutgifter i Norge. Avgrensningen følger OECD, ikke statsbudsjettets poster.",
         description_en="OECD DAC: net disbursements of bilateral ODA by recipient country, excluding in-donor refugee costs. The scope follows the OECD, not the budget items."),
    dict(id="oda_multi", kind="oda", name_nb="Multilateral bistand (ODA), utbetalt", name_en="Multilateral aid (ODA), disbursed", nature="grant", commitment="political",
         description_nb="OECD DAC: kjernebidrag til multilaterale organisasjoner (netto utbetalinger).", description_en="OECD DAC: core contributions to multilateral organisations (net disbursements)."),
    dict(id="oda_refugee", kind="oda", name_nb="Flyktningutgifter i Norge (regnet som ODA av OECD)", name_en="In-donor refugee costs (counted as ODA by the OECD)", nature="grant", commitment="political",
         description_nb="Utgifter i Norge som OECD tillater å regne som bistand. Er ikke en overføring til utlandet og er ikke med i telleren.",
         description_en="Costs in Norway that the OECD allows to be counted as aid. Not a transfer abroad and not part of the counter."),
]
for _c in ODA_CATEGORIES:
    _c["commitment_note_nb"], _c["commitment_note_en"] = COMMITMENT_NOTE["political"]

SPECIAL_RECIPIENTS = [
    dict(id="multilateral", kind="multilateral", name_nb="Multilaterale organisasjoner (kjernebidrag)", name_en="Multilateral organisations (core contributions)", iso_n3=None, iso_a3=None, region=None),
    dict(id="unallocated", kind="unallocated", name_nb="Ikke fordelt på land (regionale og ufordelte bidrag)", name_en="Not allocated to a country (regional and unallocated)", iso_n3=None, iso_a3=None, region=None),
    dict(id="norway_refugees", kind="unallocated", name_nb="Flyktningutgifter i Norge", name_en="Refugee costs in Norway", iso_n3=None, iso_a3=None, region=None),
]

SOURCES = [
    # id, navn, url, utgiver, tilgang, lisens/vilkår, oppdatering, automatisk?
    ("stortinget", "Stortingets åpne data (saker, voteringer, vedtatt budsjett)", "https://data.stortinget.no/", "Stortinget", "api", "NLOD 2.0", "løpende (hentes ukentlig)", True),
    ("ssb", "SSB StatBank (befolkning, BNP, KPI)", "https://www.ssb.no/statbank", "Statistisk sentralbyrå", "api", "CC BY 4.0", "årlig/månedlig (hentes ukentlig)", True),
    ("oecd_dac", "OECD DAC (bistand per mottakerland og totaler)", "https://data-explorer.oecd.org/", "OECD", "api", "OECD Terms and Conditions", "årlig (hentes ukentlig)", True),
    ("statsbudsjettet", "Statsbudsjettet / Gul bok (regjeringen.no)", "https://www.regjeringen.no/no/statsbudsjett/id450327", "Finansdepartementet", "manual", "NLOD 2.0", "årlig (oktober)", False),
    ("statsregnskapet", "Statsregnskapet (DFØ)", "https://statsregnskapet.dfo.no/", "DFØ", "manual", "NLOD 2.0", "årlig", False),
    ("norad", "Norad bistandsstatistikk / resultatportal", "https://resultater.norad.no/", "Norad", "manual", "NLOD 2.0", "årlig", False),
]


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def build_recipient(iso3: str) -> dict | None:
    c = pycountry.countries.get(alpha_3=iso3)
    if c is None:
        return None
    a2 = c.alpha_2
    return dict(id=iso3.lower(), kind="country", name_nb=NB.territories.get(a2, c.name), name_en=EN.territories.get(a2, c.name),
                iso_n3=int(c.numeric), iso_a3=iso3, region=None)


def build_flows(dac: dict, now: str) -> tuple[list[dict], dict[str, dict], list[str], list[str]]:
    """Flows i mill. NOK. Land: USD * OECD-implisitt kurs. Multilateralt og flyktninger: DAC1 i NOK direkte."""
    flows, recips, problems, notes = [], {}, [], []
    urls = dac["urls"]
    for y, rec in sorted(dac["dac2a_usd"].items()):
        rate = dac["rates"].get(y)
        d1n, d1u = dac["dac1_nok"].get(y, {}), dac["dac1_usd"].get(y, {})
        if not rate or "1820" not in d1n or "2000" not in d1n or "DPGC" not in rec:
            problems.append(f"{y}: mangler kurs eller DAC1-totaler")
            continue
        countries = {}
        for code, usd in rec.items():
            r = build_recipient(code) if len(code) == 3 and code.isalpha() else None
            if r:
                recips[r["id"]] = r
                countries[r["id"]] = usd
        src = dict(basis="regnskap", source_id="oecd_dac", verified=True, retrieved_at=now, price_basis="løpende")
        for rid, usd in countries.items():
            if usd < 0:
                notes.append(f"{y} {rid}: negativt netto (tilbakebetaling, {usd:.3f} mill. USD) er utelatt fra kartet")
                continue
            flows.append(dict(year=y, recipient_id=rid, category_id="oda_bilat", amount_mnok=round(usd * rate, 2), amount_usd_m=round(usd, 3), fx_nok_per_usd=round(rate, 4),
                              source_ref=urls["dac2a"], **src))
        unalloc_usd = rec["DPGC"] - sum(countries.values()) - d1u["1820"]
        if unalloc_usd < -0.01:
            problems.append(f"{y}: negativ ufordelt bilateral ({unalloc_usd:.2f} mill. USD)")
        flows.append(dict(year=y, recipient_id="unallocated", category_id="oda_bilat", amount_mnok=round(max(unalloc_usd, 0) * rate, 2), amount_usd_m=round(unalloc_usd, 3),
                          fx_nok_per_usd=round(rate, 4), source_ref=urls["dac2a"], **src))
        flows.append(dict(year=y, recipient_id="multilateral", category_id="oda_multi", amount_mnok=round(d1n["2000"], 2), amount_usd_m=round(d1u["2000"], 3), fx_nok_per_usd=round(rate, 4),
                          source_ref=urls["dac1_nok"], **src))
        flows.append(dict(year=y, recipient_id="norway_refugees", category_id="oda_refugee", amount_mnok=round(d1n["1820"], 2), amount_usd_m=round(d1u["1820"], 3), fx_nok_per_usd=round(rate, 4),
                          source_ref=urls["dac1_nok"], **src))
        # sum-sjekk mot DAC1 totalt netto ODA i NOK (avvik fra avrunding/negative land tillates til 0,2 %)
        tot = sum(f["amount_mnok"] for f in flows if f["year"] == y)
        if abs(tot - d1n["1010"]) > 0.002 * d1n["1010"]:
            problems.append(f"{y}: sum flows {tot:.1f} avviker fra DAC1 totalt {d1n['1010']:.1f}")
    return flows, recips, problems, notes


def build_year_stats(years: list[int], now: str) -> tuple[list[dict], dict, int | None]:
    pop, pinfo = ssb.fetch("population", years)
    gdp, ginfo = ssb.fetch("gdp", years)
    cpi, cinfo = ssb.fetch("cpi", years)
    base_year = max(cpi) if cpi else None
    base = cpi[base_year] if base_year else None
    rows = []
    for y in years:
        if y not in pop and y not in gdp and y not in cpi:
            continue
        rows.append(dict(year=y, population=int(pop[y]) if y in pop else None, taxpayers=None,
                         gdp_mnok=float(gdp[y]) if y in gdp else None, cpi_index=round(base / cpi[y], 4) if y in cpi else None,
                         source_id="ssb", source_ref=f"{pinfo['url']} ; {ginfo['url']} ; {cinfo['url']}", verified=True, retrieved_at=now, price_basis="løpende"))
    return rows, dict(population=pinfo, gdp=ginfo, cpi=cinfo), base_year


UNAVAILABLE = [
    dict(id="taxpayers", area_nb="Antall skattytere", area_en="Number of taxpayers", reason_nb="Ingen verifisert SSB-tabell funnet. «Per skattebetaler» vises som ikke tilgjengelig.", reason_en="No verified SSB table found. “Per taxpayer” is shown as not available."),
    dict(id="actuals_budget", area_nb="Faktisk utbetalt per budsjettpost (statsregnskapet)", area_en="Actual disbursements per budget item (state accounts)", reason_nb="statsregnskapet.dfo.no er ikke tilgjengelig fra pipeline-miljøet (nettverket blokkerer verten). Regnskapstall vises kun fra OECD DAC (ODA-avgrensning).", reason_en="statsregnskapet.dfo.no is not reachable from the pipeline environment. Accounts figures are shown only from OECD DAC (ODA scope)."),
    dict(id="norad_projects", area_nb="Prosjekter og tilskuddsmottakere (Norad)", area_en="Projects and grantees (Norad)", reason_nb="Norads resultatportal har ikke åpent API uten nøkkel, og nedlasting er ikke automatisert. Prosjektnivå vises som ikke tilgjengelig.", reason_en="Norad's results portal has no open API without a key and downloads are not automated. Project level is not available."),
    dict(id="revised_budget", area_nb="Revidert nasjonalbudsjett og tilleggsbevilgninger", area_en="Revised national budget and supplementary appropriations", reason_nb="Kun det opprinnelig vedtatte budsjettet er hentet. Endringer i budsjettåret er ikke innarbeidet.", reason_en="Only the originally adopted budget is retrieved. In-year changes are not incorporated."),
    dict(id="unit_costs", area_nb="Enhetspriser og skatteproveny til «Hva kunne vi gjort?»", area_en="Unit costs and tax revenue for “What could we do?”", reason_nb="Ingen kilder er koblet. Kalkulatoren viser bare per innbygger og andel av BNP.", reason_en="No sources are connected. The calculator shows only per-resident amounts and share of GDP."),
    dict(id="regjeringen_blocked", area_nb="regjeringen.no / statsbudsjettet.no", area_en="regjeringen.no / statsbudsjettet.no", reason_nb="Vertene svarer 403 til pipeline; vi omgår ikke blokkeringen. Budsjettall hentes i stedet fra Stortingets vedtak.", reason_en="The hosts return 403 to the pipeline; we do not bypass the block. Budget figures come from the Storting's decisions instead."),
]


def build(sessions: list[str], dac_from: int = 2014, log=print) -> dict:
    now = _now()
    definition = budget.load_definition()
    log("Budsjett (Stortinget) …")
    brows = budget.classify_all(budget.fetch_rows(sessions, log), definition)
    budget_years = sorted({r["budget_year"] for r in brows})
    log("OECD DAC …")
    dac = oecd_dac.fetch(dac_from, max(budget_years))
    flows, recips, problems, notes = build_flows(dac, now)
    if problems:
        raise ValueError("DAC-validering feilet:\n  " + "\n  ".join(problems))
    log("SSB …")
    years = list(range(dac_from, max(budget_years) + 1))
    year_stats, ssb_info, price_base = build_year_stats(years, now)

    lines = []
    for r in brows:
        lines.append(dict(year=r["budget_year"], chapter=r["chapter"], post=r["post"], name=r["name"], chapter_name=r["chapter_name"], amount_mnok=round(r["amount_nok"] / 1e6, 3),
                          amount_nok=r["amount_nok"], category_id=r["category_id"], in_scope=r["in_scope"], nature=r["nature"], commitment=r["commitment"], basis="vedtatt",
                          price_basis="løpende", source_id="stortinget", source_ref=r["source_ref"], case_ref=r["case_ref"], vote_id=r["vote_id"], vote_time=r["vote_time"],
                          verified=True, retrieved_at=now))
    cats = [dict(c, kind="budget", commitment_note_nb=COMMITMENT_NOTE[c["commitment"]][0], commitment_note_en=COMMITMENT_NOTE[c["commitment"]][1]) for c in definition["categories"]] + ODA_CATEGORIES
    sources = [dict(id=s[0], name=s[1], url=s[2], publisher=s[3], access=s[4], license=s[5], frequency=s[6], automatic=s[7],
                    retrieved_at=now if s[0] in ("stortinget", "ssb", "oecd_dac") else None,
                    status="live" if s[0] in ("stortinget", "ssb", "oecd_dac") else "manual_needed") for s in SOURCES]
    return dict(
        meta=dict(dataMode="partial", generatedAt=now, currentYear=max(budget_years), currency="NOK", unit="mnok", priceBasis="løpende kroner",
                  priceBaseYear=price_base, lastSuccessfulLiveUpdate=now, budgetYears=budget_years, dacYears=sorted({f["year"] for f in flows}),
                  definitionVersion=definition["version"], fx="NOK per USD = OECD DAC1 totalt netto ODA i NOK / i USD, samme år", ssb=ssb_info,
                  notice_nb="Deler av datasettet er ikke tilgjengelig (se «Metode og kilder»). Tallene som vises er hentet fra Stortinget, SSB og OECD DAC.",
                  notice_en="Parts of the dataset are not available (see “Method and sources”). The figures shown are retrieved from the Storting, Statistics Norway and the OECD DAC.",
                  unavailable=UNAVAILABLE, notes=notes),
        sources=sources, categories=cats, recipients=sorted(list(recips.values()), key=lambda r: r["id"]) + SPECIAL_RECIPIENTS,
        flows=flows, budgetLines=lines, projects=[], yearStats=year_stats, unitCosts=[], taxItems=[])
