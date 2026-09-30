# Slik oppdateres data

```bash
pip install pytest         # kun for test
python3 pipeline/run.py --mode mock   # regenerer demodata
python3 pipeline/run.py --mode live   # hent fra kilder (krever nettverk), fall tilbake til mock per hull
python3 pipeline/validate.py          # valider public/data/dataset.json
npm run build                          # statisk side i out/
```

## Legge inn ekte tall (manuell import)
1. Last ned fra kilden (Norad, statsregnskapet, Gul bok …).
2. Normaliser til CSV i `data/raw/<kilde>/<fil>.csv` med kolonnene i `data/raw/README.md`. `source_ref` må være en dypllenke.
3. Kjør `--mode live`. Importerte rader erstatter mock for samme (år, kategori) og merkes `verified=true`. Når alt er verifisert blir `dataMode=live` og demobanneret forsvinner.
4. Enhetspriser/proveny/årsstatistikk: rediger `pipeline/mock_data.py` (eller flytt til egne CSV) og sett `verified=True` med kilde-URL når tallene er kontrollert.

## Status per kilde
`dataset.json → meta.pipelineLog` og `sources[].status` viser `live | failed | manual_needed | mock`. Siden viser dato for siste vellykkede henting i bunnteksten.

## Automatisk kjøring
`.github/workflows/update-data.yml` kjører ukentlig (mandag) og ved manuell start, validerer og åpner en PR. Kjør den manuelt etter statsbudsjettet (oktober) og revidert nasjonalbudsjett (mai).

## Postgres (valgfritt)
`db/schema.sql` beskriver samme modell relasjonelt. Appen leser i dag statiske JSON/CSV-filer; database er ikke påkrevd. Lasting til Postgres er ikke implementert.

## Åpent API
Filene i `public/data/` (`dataset.json`, `*.csv`) serveres statisk på `/data/…` og er det åpne API-et.
