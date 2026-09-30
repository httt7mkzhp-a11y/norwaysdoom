# Kostnadsutvikling: arbeidsflyt og godkjenningsformat

Ingen felles API finnes. Pipeline (`python3 pipeline/projects_build.py`):

1. `pipeline/config/projects.json` definerer prosjekter (navn, etat, nøkkelord, søk mot Stortingets saker, budsjettkomité).
2. Sakene finnes via data.stortinget.no (tittelsøk over sesjonene i configen + budsjettinnstillinger fra aktuell komité + faste saks-ID-er). For hver sak hentes publikasjonslenker; **innstillinger (Innst. S) lastes ned som PDF fra stortinget.no**. Proposisjoner og meldinger ligger på regjeringen.no som blokkerer pipelinen; de omgås ikke (se datahull.md). Riksrevisjonens dokumenter og Bane NOR/Statsbygg-dokumenter er ikke koblet automatisk ennå.
3. Tekst trekkes ut side for side (pypdf). Kandidater er setninger med prosjektets nøkkelord, et beløp (mill./mrd. kroner) og et kostnadsord. Hver kandidat har side, tekstutdrag, tolkede beløp, prisnivå-treff (f.eks. «2018-kroner») og en *gjetning* på årsakskategori. Skrives til `data/review/queue/<prosjekt>.json`. **Køen publiseres aldri.**
4. Gjennomgang: les kilden og kopier godkjente poster til `data/review/approved/<prosjekt>.json`.

## Format på godkjent post

```json
{
  "project_id": "follobanen",
  "status_note": "Kort statusbeskrivelse med kilde (valgfritt)",
  "entries": [
    {
      "id": "follobanen-2018-ramme",
      "kind": "cost_frame",                    // cost_frame | cost_change | incurred | status | decision
      "date": "2018-06-14",                    // datoen tallet gjelder (f.eks. vedtaksdato)
      "amount_mnok": 0,                        // mill. kr, løpende, slik kilden oppgir
      "amount_type": "kostnadsramme",          // kostnadsramme | styringsramme | påløpt | anslag
      "price_level_year": 2018,                // prisnivået tallet er oppgitt i; eller "price_level_unknown": true
      "reason_nb": "Begrunnelse slik kilden gir den",
      "reason_en": "Reason as the source states it",
      "reason_category": "scope",              // scope | price | requirements | uncertainty | other | null
      "source_url": "https://www.stortinget.no/globalassets/pdf/innstillinger/...pdf",
      "page": 12,
      "quote": "eksakt tekst fra siden",
      "queue_id": "abc123def456",              // valgfri: id i køen
      "reviewed_by": "navn",
      "reviewed_at": "2026-10-01"
    }
  ]
}
```

Ved hver kjøring kontrolleres at `quote` finnes på `page` i det nedlastede dokumentet. Mangler sitatet, feiler bygget og `public/data/projects.json` beholdes. Belopene på siden er da alltid sporbare til én side i et dokument.

## Faste kroner
Siden regner løpende beløp om til faste kroner (basisår = siste hele KPI-år fra SSB) med `price_level_year`. Mangler prisnivå, vises «ikke tilgjengelig» i faste kroner og løpende og faste tall blandes aldri.

## Legge til et prosjekt
1. Legg til et objekt i `projects.json` (id, navn, etat, nøkkelord, `case_title_regex`, `budget_committees`, `storting_area`).
2. Legg til området i `pipeline/config/storting.json` (`areas`) hvis voteringer skal kobles.
3. Opprett `data/review/approved/<id>.json` med tom liste.
4. Kjør `python3 pipeline/projects_build.py`, gå gjennom køen og godkjenn poster.
