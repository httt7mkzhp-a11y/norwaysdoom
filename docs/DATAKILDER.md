# Datakilder: kartlegging og hull

**Viktig:** Kartleggingen er gjort uten nettverkstilgang til norske kilder (utviklingsmiljøet blokkerte data.ssb.no, norad.no, stortinget.no, regjeringen.no, statsregnskapet.no og OECD). Ingen API er testet live. Alt under må verifiseres ved første kjøring med `--mode live`.

| Behov | Kilde | Tilgang | Status i koden |
|---|---|---|---|
| Befolkning, BNP, KPI | SSB StatBank (PxWebApi, JSON-stat2) | API | Skrevet (`pipeline/sources/ssb.py`), **utestet**, tabell-id/koder må verifiseres |
| Antall skattytere | SSB (skattestatistikk) | API/nedlasting | **Ikke koblet**; mock |
| Budsjettsaker/vedtak | data.stortinget.no (XML) | API | Skrevet (`stortinget.py`), **utestet**; gir kun saksreferanser |
| Beløp per post/mottaker, vedtatt | Gul bok / Prop. 1 S (regjeringen.no, statsbudsjettet.no) | PDF/HTML | **Manuell import** |
| Faktiske tall | Statsregnskapet (DFØ) | Nedlasting | **Manuell import** |
| Bistand per land/sektor | Norad bistandsstatistikk/resultatportal | Nedlasting | **Manuell import** |
| Bistand per land (internasjonal) | OECD DAC via Data Explorer (SDMX) | API | **Ikke koblet**; ved behov last ned CSV og importer |
| Bidrag FN/NATO/EØS | UD, FD, Gul bok | PDF | **Manuell import** |
| Enhetspriser (sykehjem, lærer, vei …) | SSB KOSTRA, SSB lønn, Statens vegvesen/NTP | API/manuell | **Plassholdere (mock)** |
| Skatteproveny (formuesskatt, matmoms) | Finansdepartementet (Prop. 1 LS, proveny­tabeller) | PDF | **Plassholdere (mock)** |
| Mottakerlandenes geometri | Natural Earth via `world-atlas` 110m | npm | Brukt; mangler små stater |

## Kjente hull
1. Ingen reelle beløp er inne. Alle flows, prosjekter, enhetspriser og proveny er illustrative (`verified=false`, `dataMode=mock`).
2. Kobling mellom budsjettposter og mottakerland finnes ikke maskinlesbart i statsbudsjettet. Bistandsstatistikk (Norad/OECD) er nærmeste kilde for land, men bruker OECD-avgrensning (ODA) som ikke er lik vår.
3. Prosjektnivå (tilskuddsmottaker, formål) fås fra Norad-portalen; dekning for forsvar/NATO og Ukraina-støtte må avklares.
4. Gave/lån og forpliktelsesgrad per kategori er et utkast.
5. Faste kroner bruker KPI; annen deflator kan velges.
6. Flyktningutgifter i Norge er utelatt bevisst.
