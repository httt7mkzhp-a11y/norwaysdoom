# Datahull

Det som ikke er tilgjengelig skal vises som «ikke tilgjengelig» på siden og stå her. Ingenting fylles med gjetning.

## Stortinget
1. **Voteringer uten registrerte stemmer** (enstemmig vedtatt og andre ikke-personlige voteringer): ingen parti- eller representantfordeling. Vises som «ikke tilgjengelig» med begrunnelse. Omfang 2025–2026: 10 av 282 budsjettvoteringer.
2. **Områdekobling er nøkkelordsøk** (bistand, Ukraina/Nansen, FN/EØS/NATO, Follobanen, Regjeringskvartalet) på tittel, emner, votering-tema og forslagstekst. Budsjettvoteringer der forslagsteksten ikke nevner ordene, får ikke områdemerke, selv om de gjelder området (kapitler er oppgitt med tall, ikke navn). Kan gi både feiltreff og mangler.
3. **Kun to sesjoner for budsjettsaker** (2024–2025, 2025–2026); områdesaker fra 2013–2014. Utvid i `pipeline/config/storting.json`.
4. **Beløp** ligger ikke i Stortingets åpne data. Forslagstekst kan inneholde tall, men de er ikke trukket ut eller brukt som datapunkt.
5. **Tilbakedaterte partiskifter**: parti på representanten er slik Stortinget oppgir det ved voteringen.

## Beløp, statsbudsjett, Norad, SSB, kostnadsutvikling
Ikke gjennomgått ennå. Foreløpig er alle beløp i `public/data/dataset.json` mockdata (`verified=false`), se [DATAKILDER.md](DATAKILDER.md). SSB-uthenting feilet med HTTP 400 ved siste kjøring.
