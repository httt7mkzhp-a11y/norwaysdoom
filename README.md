# Norges utenlandsteller

Norsk nettside (Next.js + TypeScript + Tailwind, D3-geo, Recharts) med estimert sanntidsteller for norske overføringer til utlandet over statsbudsjettet, verdenskart, kategorier og «Hva kunne vi gjort?»-kalkulator. Norsk/engelsk, lyst/mørkt.

> **Status: demo.** Alle tall er illustrative eksempeldata, merket i UI og i hver rad (`verified=false`). Ingen live-kilder er testet. Se [docs/DATAKILDER.md](docs/DATAKILDER.md).

```bash
npm install
npm run dev          # http://localhost:3000
npm test && npm run lint && python3 -m pytest tests
npm run build        # statisk eksport i out/
```

- Datamodell: [db/schema.sql](db/schema.sql). Pipeline: `pipeline/`. Oppdatering: [docs/OPPDATERING.md](docs/OPPDATERING.md).
- Teller: lineær fordeling av årets beløp (Europe/Oslo), regnet i nettleseren (`lib/counter.ts`).
- Åpne data: `public/data/*.csv` og `dataset.json`.
