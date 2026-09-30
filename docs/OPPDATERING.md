# Slik oppdateres data

```bash
pip install -r pipeline/requirements.txt pytest
python3 pipeline/run.py                # Stortinget (saker, voteringer, vedtatt budsjett), SSB, OECD DAC -> public/data
python3 pipeline/projects_build.py     # kostnadsutvikling: kø + godkjente poster -> public/data/projects.json
python3 pipeline/validate.py           # valider public/data/dataset.json
npm run build                          # statisk side i out/
```

Første kjøring er treg (voteringsresultater ~3 s per votering). Svar caches i `data/cache/` (ikke i git); senere kjøringer er raske. Pipelinen bruker rate limiting (0,4 s mellom kall), retry med backoff, og en User-Agent som identifiserer prosjektet. Vertene som svarer 403 (regjeringen.no, statsregnskapet.dfo.no, banenor.no) omgås ikke.

## Alt-eller-ingenting
`run.py`, `storting_build.py` og `projects_build.py` skriver først til midlertidig sted og bytter bare ved suksess. Ved kildefeil, valideringsfeil eller stort avvik mot forrige uttrekk avsluttes prosessen med feilkode og eksisterende filer i `public/data/` røres ikke.
- `run.py`: avviser mer enn 10 % nedgang i antall rader, eller mer enn 25 % endring i årssum. Etter manuell kontroll: `--accept-drift`.
- `storting_build.py`: avviser mer enn 5 % nedgang i saker/voteringer (`--max-drop`).

## Nytt budsjettår
1. Legg sesjonen til i `SESSIONS` i `pipeline/run.py`.
2. Kjør pipelinen. Feiler den på «ikke klassifisert bistandspost» eller «forventer …», er budsjettstrukturen endret: gå gjennom postene og oppdater `pipeline/config/definition.json` (bruk `years` for regler som gjelder bestemte år), og oppdater `years_verified`.

## Legge til en kilde
1. Skriv `pipeline/sources/<kilde>.py` med parsing som kan testes uten nettverk (fixtures i `tests/`).
2. Bygg radene i `pipeline/real_data.py` med `source_ref` (URL), `retrieved_at`, `basis`, `price_basis`.
3. Legg kilden i `SOURCES` (lisens, oppdateringsfrekvens, automatisk/manuell).
4. Det som ikke kan hentes legges i `UNAVAILABLE` (vises på siden) og i `docs/datahull.md`.

## Legge til et prosjekt
Se [prosjekter.md](prosjekter.md).

## Legge til/endre område for Stortinget
Rediger `areas` i `pipeline/config/storting.json` (id, navn, nøkkelord, emner). Sesjoner styres i samme fil.

## Automatisk kjøring
`.github/workflows/update-data.yml` kjører ukentlig (mandag) og ved manuell start. Testene kjøres først; jobben feiler tydelig ved feil og åpner en PR bare ved suksess. Kjør den manuelt etter statsbudsjettet (oktober).

## Postgres (valgfritt)
`db/schema.sql` beskriver samme modell relasjonelt. Appen leser statiske JSON/CSV-filer; lasting til Postgres er ikke implementert.

## Åpent API
Filene i `public/data/` serveres statisk på `/data/…`.
