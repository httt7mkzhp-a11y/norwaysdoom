"""Deterministisk MOCK-datasett. ALLE tall her er illustrative og IKKE hentet fra noen kilde.

Formålet er å kunne utvikle og teste frontend/pipeline. Datasettet får meta.dataMode = "mock",
og alle rader verified = false. Byttes ut av run.py --mode live når kildene er koblet på.
"""
import random

from .reference import CATEGORIES, COUNTRIES, MULTILATERALS, SOURCES

YEARS = list(range(2016, 2027))
CURRENT_YEAR = 2026

# Illustrativ total per kategori og år (mill. NOK, løpende kroner).
CATEGORY_TOTALS = {
    "dev":  [21000, 21500, 22000, 22500, 24000, 24500, 26000, 27000, 27500, 28000, 28500],
    "hum":  [ 6500,  6700,  6800,  7000,  7500,  7800,  9500,  9800,  9500,  9500,  9500],
    "ukr":  [    0,     0,     0,     0,     0,     0, 11000, 27000, 32000, 35000, 35000],
    "org":  [ 9000,  9300,  9500,  9800, 10300, 10800, 11500, 12000, 12300, 12600, 12900],
    "eea":  [ 2600,  2700,  2800,  2900,  3100,  3300,  3500,  3700,  3900,  4100,  4300],
    "def":  [  900,   950,  1000,  1050,  1150,  1200,  1400,  1700,  2200,  2600,  3000],
    "clim": [ 3300,  3500,  3600,  3800,  3900,  4000,  3800,  3900,  4000,  4100,  4200],
}

# Vekter per kategori -> mottaker-id. Illustrative.
WEIGHTS = {
    "dev": {"tza": 8, "uga": 7, "moz": 6, "mwi": 6, "zmb": 5, "eth": 6, "ken": 3, "nep": 5, "bgd": 3, "mli": 3, "ner": 2, "nga": 2,
            "gha": 2, "lbr": 3, "col": 3, "pak": 2, "ind": 1, "per": 1, "idn": 1, "m_un": 5, "m_unalloc": 15},
    "hum": {"syr": 8, "afg": 5, "yem": 5, "pse": 9, "sdn": 7, "ssd": 6, "som": 7, "cod": 5, "eth": 4, "lbn": 3, "jor": 3, "irq": 3, "mmr": 3,
            "hti": 2, "bgd": 2, "ukr": 6, "m_un": 25, "m_unalloc": 10},
    "ukr": {"ukr": 88, "mda": 4, "geo": 1, "m_unalloc": 7},
    "org": {"m_un": 40, "m_wb": 22, "m_rdb": 14, "m_gf": 16, "m_unalloc": 8},
    "eea": {"pol": 30, "rou": 18, "bgr": 7, "ltu": 5, "lva": 4, "est": 3, "cze": 6, "svk": 5, "hun": 5, "hrv": 4, "grc": 5, "prt": 3, "m_eu": 40},
    "def": {"m_nato": 100},
    "clim": {"bra": 30, "idn": 18, "guy": 8, "col": 14, "cod": 8, "per": 8, "eth": 4, "m_unalloc": 10},
}

CPI_ANNUAL = {2017: 1.8, 2018: 2.7, 2019: 2.2, 2020: 1.3, 2021: 3.5, 2022: 5.8, 2023: 5.5, 2024: 3.1, 2025: 3.0, 2026: 3.0}
POPULATION = [5258317, 5295619, 5328212, 5367580, 5391369, 5425270, 5488984, 5550203, 5594340, 5640000, 5680000]
TAXPAYERS = [3950000, 3990000, 4020000, 4060000, 4090000, 4120000, 4180000, 4250000, 4280000, 4320000, 4350000]
GDP = [3100000, 3300000, 3600000, 3700000, 3600000, 4400000, 5700000, 5100000, 5000000, 5100000, 5200000]

PROJECT_TITLES = {
    "dev": [("Utdanningsprogram", "Education programme", "Styrke grunnutdanning og lærerutdanning.", "Strengthen basic and teacher education."),
            ("Helsesystemstøtte", "Health system support", "Bedre primærhelsetjenester.", "Improve primary health services."),
            ("Næringsutvikling", "Economic development", "Støtte til små og mellomstore bedrifter.", "Support for small and medium enterprises.")],
    "hum": [("Nødhjelpsinnsats", "Emergency response", "Mat, vann og tilfluktsrom.", "Food, water and shelter."),
            ("Beskyttelse av sivile", "Protection of civilians", "Beskyttelse og minerydding.", "Protection and demining.")],
    "ukr": [("Energisikkerhet", "Energy security", "Reparasjon og vedlikehold av energiinfrastruktur.", "Repair and maintenance of energy infrastructure."),
            ("Sivil støtte", "Civilian support", "Sivil støtte og gjenoppbygging.", "Civilian support and reconstruction.")],
    "org": [("Kjernebidrag", "Core contribution", "Generelt driftsbidrag.", "General operating contribution."),
            ("Tematisk fond", "Thematic fund", "Øremerket tematisk bidrag.", "Earmarked thematic contribution.")],
    "eea": [("Sivilsamfunnsfond", "Civil society fund", "Støtte til frivillige organisasjoner.", "Support to civil society organisations."),
            ("Grønn industri", "Green industry", "Grønn omstilling.", "Green transition.")],
    "def": [("Felles finansiering", "Common funding", "Bidrag til NATOs felles budsjetter.", "Contribution to NATO common budgets.")],
    "clim": [("Skogbevaring", "Forest conservation", "Resultatbasert betaling for redusert avskoging.", "Results-based payment for reduced deforestation.")],
}


def generate(now_iso: str) -> dict:
    rng = random.Random(20260930)
    recipients = [
        dict(id=c[0], kind="country", name_nb=c[1], name_en=c[2], iso_n3=c[3], iso_a3=c[4], region=c[5]) for c in COUNTRIES
    ] + [
        dict(id=m[0], kind=m[1], name_nb=m[2], name_en=m[3], iso_n3=None, iso_a3=None, region=None) for m in MULTILATERALS
    ]
    src_for = {"dev": "norad", "hum": "norad", "ukr": "stortinget", "org": "ud", "eea": "ud", "def": "fd", "clim": "norad"}

    flows, projects = [], []
    for cat, totals in CATEGORY_TOTALS.items():
        weights = WEIGHTS[cat]
        for yi, year in enumerate(YEARS):
            total = totals[yi]
            if total == 0:
                continue
            raw = {rid: w * rng.uniform(0.7, 1.3) for rid, w in weights.items()}
            s = sum(raw.values())
            basis = "vedtatt" if year == CURRENT_YEAR else "regnskap"
            for rid, r in raw.items():
                amt = round(total * r / s, 1)
                flows.append(dict(year=year, recipient_id=rid, category_id=cat, amount_mnok=amt, basis=basis,
                                  source_id=src_for[cat], source_ref="MOCK", verified=False))
                if year >= CURRENT_YEAR - 2 and amt > 400:
                    titles = PROJECT_TITLES[cat]
                    k = min(len(titles), 2 if amt < 1500 else 3)
                    shares = [rng.uniform(0.1, 0.35) for _ in range(k)]
                    for j in range(k):
                        t = titles[j]
                        projects.append(dict(
                            id=f"mock-{year}-{rid}-{cat}-{j}", year=year, recipient_id=rid, category_id=cat,
                            title_nb=f"{t[0]} (eksempeldata)", title_en=f"{t[1]} (sample data)",
                            purpose_nb=t[2], purpose_en=t[3],
                            grantee="Eksempelmottaker (mock)", amount_mnok=round(amt * shares[j], 1),
                            source_id=src_for[cat], source_ref="MOCK", verified=False))

    cpi = {2026: 1.0}
    for y in range(2025, 2015, -1):
        cpi[y] = round(cpi[y + 1] / (1 + CPI_ANNUAL[y + 1] / 100), 4)
    year_stats = [dict(year=y, population=POPULATION[i], taxpayers=TAXPAYERS[i], gdp_mnok=GDP[i], cpi_index=cpi[y],
                       source_id="ssb", verified=False) for i, y in enumerate(YEARS)]

    # Enhetspriser. Verdiene er PLASSHOLDERE for å teste kalkulatoren; kilde-URL peker på utgiver.
    def uc(id, nb, en, unb, uen, v, lo, hi, src, url):
        return dict(id=id, label_nb=nb, label_en=en, unit_nb=unb, unit_en=uen, value_nok=v, low_nok=lo, high_nok=hi,
                    price_year=2026, source_id=src, source_url=url, verified=False)
    unit_costs = [
        uc("nursing_home", "Drift av sykehjemsplass (heldøgn, per år)", "Running a nursing-home place (24h, per year)", "sykehjemsplasser", "nursing-home places",
           1_300_000, 1_100_000, 1_600_000, "ssb_kostra", "https://www.ssb.no/kostra"),
        uc("teacher", "Lærerårsverk (lønn + sosiale kostnader)", "Teacher full-time equivalent (salary + on-costs)", "lærerårsverk", "teacher FTEs",
           850_000, 750_000, 950_000, "ssb", "https://www.ssb.no/statbank"),
        uc("nurse", "Sykepleierårsverk (lønn + sosiale kostnader)", "Nurse full-time equivalent (salary + on-costs)", "sykepleierårsverk", "nurse FTEs",
           800_000, 700_000, 900_000, "ssb", "https://www.ssb.no/statbank"),
        uc("kindergarten", "Barnehageplass (per år)", "Kindergarten place (per year)", "barnehageplasser", "kindergarten places",
           220_000, 190_000, 260_000, "ssb_kostra", "https://www.ssb.no/kostra"),
        uc("road_km", "Nybygd motorvei (per km)", "New motorway (per km)", "km motorvei", "km of motorway",
           300_000_000, 150_000_000, 500_000_000, "vegvesen", "https://www.vegvesen.no/"),
    ]
    tax_items = [
        dict(id="wealth_tax", label_nb="Fjerne formuesskatten", label_en="Abolish the wealth tax",
             revenue_mnok=25000, low_mnok=20000, high_mnok=30000, price_year=2026,
             note_nb="Formuesskatt er en INNTEKT for staten. Tallet er provenyet staten mister, ikke en utgift. Provenyanslag avhenger av atferdsendringer og flytting.",
             note_en="The wealth tax is REVENUE for the state. The figure is the revenue lost, not an expense. Estimates depend on behavioural responses and relocation.",
             source_id="finansdep_skatt", source_url="https://www.regjeringen.no/no/dep/fin/id216/", verified=False),
        dict(id="food_vat_zero", label_nb="Fjerne matmomsen helt", label_en="Remove VAT on food entirely",
             revenue_mnok=35000, low_mnok=30000, high_mnok=40000, price_year=2026,
             note_nb="Provenytap ved 0 % i stedet for gjeldende sats. Usikkerhet knyttet til avgrensning av matvarer og tilpasning i prissetting.",
             note_en="Revenue lost at 0% instead of the current rate. Uncertainty from product delimitation and pricing pass-through.",
             source_id="finansdep_skatt", source_url="https://www.regjeringen.no/no/dep/fin/id216/", verified=False),
        dict(id="food_vat_pp", label_nb="Redusere matmomsen med 1 prosentpoeng", label_en="Cut VAT on food by 1 percentage point",
             revenue_mnok=2300, low_mnok=2000, high_mnok=2700, price_year=2026,
             note_nb="Provenytap per prosentpoeng, tilnærmet lineært.", note_en="Revenue lost per percentage point, approximately linear.",
             source_id="finansdep_skatt", source_url="https://www.regjeringen.no/no/dep/fin/id216/", verified=False),
    ]
    sources = [dict(id=s[0], name=s[1], url=s[2], publisher=s[3], access=s[4], retrieved_at=None, status="mock") for s in SOURCES]

    return dict(
        meta=dict(dataMode="mock", generatedAt=now_iso, currentYear=CURRENT_YEAR, currency="NOK", unit="mnok",
                  priceBasis="løpende kroner", lastSuccessfulLiveUpdate=None,
                  notice_nb="DEMO: Alle tall i dette datasettet er illustrative eksempeldata og er IKKE hentet fra offentlige kilder.",
                  notice_en="DEMO: All figures in this dataset are illustrative sample data and have NOT been retrieved from public sources."),
        sources=sources, categories=CATEGORIES, recipients=recipients, flows=flows, projects=projects,
        yearStats=year_stats, unitCosts=unit_costs, taxItems=tax_items,
    )
