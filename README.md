# Norges utenlandsteller

Norsk nettside (Next.js + TypeScript + Tailwind, D3-geo, Recharts) om statlige utgifter til utlandet, Stortingets voteringer og kostnadsutvikling i store statlige prosjekter. Norsk/engelsk, lyst/mørkt.

Alle tall hentes av kode fra offentlige kilder og har kilde-URL, kildenavn, hentedato, år/periode, beløpstype (vedtatt / utbetalt) og prisgrunnlag. Det som ikke lar seg hente vises som «ikke tilgjengelig» og står i [docs/datahull.md](docs/datahull.md).

| Del | Kilde | Status |
|---|---|---|
| Vedtatt budsjett for utlandsposter (teller, kategorier) | data.stortinget.no (voteringsforslag) | automatisk |
| Bistand per mottakerland, utbetalt (kart) | OECD DAC (SDMX) | automatisk |
| Befolkning, BNP, KPI | SSB StatBank | automatisk |
| Saker og voteringer med parti/representant | data.stortinget.no | automatisk |
| Kostnadsutvikling Follobanen, Regjeringskvartalet | Innst. S (stortinget.no) → gjennomgangskø | uttrekk automatisk, **publisering kun etter manuell godkjenning** |

```bash
pip install -r pipeline/requirements.txt pytest
npm install
python3 pipeline/run.py            # Stortinget, SSB, OECD DAC -> public/data (første kjøring er treg, svar caches i data/cache/)
python3 pipeline/projects_build.py # kostnadsutvikling: kø + godkjente poster -> public/data/projects.json
npm run dev                        # http://localhost:3000
npm test && npm run lint && python3 -m pytest tests
npm run build                      # statisk eksport i out/
```

- Metode og definisjon av «utgift til utlandet»: [docs/metode.md](docs/metode.md) og siden «Metode og kilder».
- Oppdatering, nye kilder og nye prosjekter: [docs/OPPDATERING.md](docs/OPPDATERING.md), [docs/prosjekter.md](docs/prosjekter.md).
- Planen og hva som virker: [docs/PLAN.md](docs/PLAN.md). Hull: [docs/datahull.md](docs/datahull.md).
- Datamodell: [db/schema.sql](db/schema.sql). Åpne data: `public/data/*.csv`, `dataset.json`, `storting/`, `projects.json`.
- Telleren fordeler årets vedtatte budsjett jevnt over året (Europe/Oslo) i nettleseren (`lib/counter.ts`). Den er ikke sanntidstransaksjoner.
