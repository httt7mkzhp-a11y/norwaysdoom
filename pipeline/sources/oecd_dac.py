"""OECD DAC (SDMX REST, sdmx.oecd.org). Testet mot live-API 2026-09-30.

Datasett:
  DSD_DAC2@DF_DAC2A  Norges bistand (ODA) til mottakerland. Nøkkel DONOR.RECIPIENT.MEASURE.UNIT_MEASURE.PRICE_BASE
                     NOR..206.USD.V  = netto ODA-utbetalinger, USD, løpende priser (NOK finnes ikke i dette datasettet).
  DSD_DAC1@DF_DAC1   Norges totaler. Nøkkel DONOR.SECTOR.MEASURE.TYING_STATUS.FLOW_TYPE.UNIT_MEASURE.PRICE_BASE
                     NOR..{1010,1015,2000,1820}..1140.{XDC,USD}.V  (1140 = netto utbetalinger; XDC = NOK)

Valutaomregning: NOK = USD * (DAC1 totalt netto ODA i NOK / DAC1 totalt netto ODA i USD) for samme år,
altså OECDs implisitte årskurs. Kontroll: summen av mottakerlandene og aggregatene må gå opp mot DAC1.
ODA-avgrensningen (OECD) er ikke lik statsbudsjettets poster. Se docs/metode.md.
Vilkår: OECD Terms and Conditions (åpen bruk med kildehenvisning).
"""
import csv
import io

from ..net import cached_get

BASE = "https://sdmx.oecd.org/public/rest/data/OECD.DCD.FSD,"
HDR = {"Accept": "application/vnd.sdmx.data+csv"}
EXPLORER = "https://data-explorer.oecd.org/"
ALL_RECIPIENTS = "ALLR"      # alle mottakere (= total ODA)
ALL_MULTI = "ALLMR"          # multilateral
DEVELOPING = "DPGC"          # bilateral til utviklingsland (= DAC1 1015)


def _csv(url: str, ttl_hours: float = 24) -> list[dict]:
    import urllib.request
    from ..net import CACHE_DIR, UA, _throttle  # noqa: PLC2701
    import hashlib
    import time
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    f = CACHE_DIR / (hashlib.sha256(("csv" + url).encode()).hexdigest()[:32] + ".bin")
    if f.exists() and time.time() - f.stat().st_mtime < ttl_hours * 3600:
        raw = f.read_bytes()
    else:
        _throttle()
        req = urllib.request.Request(url, headers={"User-Agent": UA, **HDR})
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read()
        f.write_bytes(raw)
    return list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))


def dac2a_url(start: int, end: int) -> str:
    return f"{BASE}DSD_DAC2@DF_DAC2A,/NOR..206.USD.V?startPeriod={start}&endPeriod={end}"


def dac1_url(start: int, end: int, unit: str) -> str:
    return f"{BASE}DSD_DAC1@DF_DAC1,/NOR..1010+1015+2000+1820..1140.{unit}.V?startPeriod={start}&endPeriod={end}"


def parse_dac2a(rows: list[dict]) -> dict[int, dict[str, float]]:
    """år -> mottakerkode -> mill. USD (løpende)."""
    out: dict[int, dict[str, float]] = {}
    for r in rows:
        if r["MEASURE"] != "206" or r["UNIT_MEASURE"] != "USD" or r["PRICE_BASE"] != "V" or r["OBS_VALUE"] == "":
            continue
        out.setdefault(int(r["TIME_PERIOD"]), {})[r["RECIPIENT"]] = float(r["OBS_VALUE"])
    return out


def parse_dac1(rows: list[dict]) -> dict[int, dict[str, float]]:
    """år -> mål (1010 total, 1015 bilateral, 2000 multilateral, 1820 flyktninger i giverland) -> mill. i valgt enhet."""
    out: dict[int, dict[str, float]] = {}
    for r in rows:
        if r["FLOW_TYPE"] != "1140" or r["PRICE_BASE"] != "V" or r["OBS_VALUE"] == "":
            continue
        out.setdefault(int(r["TIME_PERIOD"]), {})[r["MEASURE"]] = float(r["OBS_VALUE"])
    return out


def implied_rates(nok: dict[int, dict[str, float]], usd: dict[int, dict[str, float]]) -> dict[int, float]:
    """NOK per USD = DAC1 totalt netto ODA i NOK / i USD."""
    return {y: nok[y]["1010"] / usd[y]["1010"] for y in nok if y in usd and "1010" in nok[y] and usd[y].get("1010")}


def fetch(start: int, end: int) -> dict:
    d2 = parse_dac2a(_csv(dac2a_url(start, end)))
    nok = parse_dac1(_csv(dac1_url(start, end, "XDC")))
    usd = parse_dac1(_csv(dac1_url(start, end, "USD")))
    return dict(dac2a_usd=d2, dac1_nok=nok, dac1_usd=usd, rates=implied_rates(nok, usd),
                urls=dict(dac2a=dac2a_url(start, end), dac1_nok=dac1_url(start, end, "XDC"), dac1_usd=dac1_url(start, end, "USD")))
