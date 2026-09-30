# Datahull

Det som ikke er tilgjengelig vises som «ikke tilgjengelig» på siden (se `meta.unavailable` i `dataset.json`) og står her. Ingenting fylles med gjetning.

## Utgifter til utlandet
1. **Faktisk utbetalt per budsjettpost (statsregnskapet, DFØ):** `statsregnskapet.dfo.no` er ikke tilgjengelig fra pipeline-miljøet (proxy svarer 403). Regnskapstall kommer bare fra OECD DAC (ODA-avgrensning), som ikke er lik statsbudsjettets poster.
2. **regjeringen.no og statsbudsjettet.no:** svarer 403 til pipelinen. Omgås ikke. Vedtatt budsjett hentes i stedet fra Stortingets vedtak (voteringsforslag i data.stortinget.no). Gul bok og proposisjoner er ikke brukt som kilde.
3. **Revidert nasjonalbudsjett og tilleggsbevilgninger:** ikke innarbeidet. Telleren bruker opprinnelig vedtatt budsjett. Endringer i budsjettåret (stort for Ukraina-støtten) er ikke med.
4. **Norad (prosjekter, tilskuddsmottakere, sektor):** `resultater.norad.no` er en nettapp som bruker et API bak nøkkel. Vi bruker ikke nøkkelen. Prosjektnivå og sektorfordeling er ikke tilgjengelig. Bistand per mottakerland kommer fra OECD DAC.
5. **OECD DAC oppgir USD.** Omregning til NOK bruker OECDs implisitte årskurs (DAC1 totalt netto ODA i NOK / USD). Norges Bank er ikke tilgjengelig fra pipelinen.
6. **Budsjettårene 2025 og 2026:** definisjonen (`pipeline/config/definition.json`) er kontrollert mot disse to. Nye år krever gjennomgang; pipelinen feiler hvis en bistandspost mangler regel eller postnavnet ikke stemmer med regelens forventning. Kap. 1750 post 21 (2026, 28,6 mrd. kr) er utelatt for å unngå dobbelttelling (kan nyttes under post 79). Utfallet påvirker telleren sterkt.
7. **Definisjonen er manuelt kuratert** (kategorier, «pliktige bidrag», kapitalinnskudd, NATO som medlemskap, EØS som avtalefestet). Det finnes ingen offisiell liste over «utgifter til utlandet».
8. **Antall skattytere:** ingen verifisert SSB-tabell funnet. «Per skattebetaler» vises som ikke tilgjengelig.
9. **Enhetspriser og skatteproveny** (til «Hva kunne vi gjort?»): ikke koblet. Kalkulatoren viser bare per innbygger og andel av BNP.
10. **Region for land** er ikke hentet. **Kartgeometri** (Natural Earth 110m) mangler små stater.
11. **Faste kroner:** SSB KPI finnes ikke for 2026, så faste kroner mangler for 2026.
12. **Små negative nettobeløp** (tilbakebetalinger) per land er utelatt fra kartet og står i `meta.notes`. Summen mot OECD-totalen er kontrollert (avvik under 0,2 %).

## Stortinget
1. **Voteringer uten registrerte stemmer** (enstemmig vedtatt): ingen parti- eller representantfordeling.
2. **Områdekobling er nøkkelordsøk** på tittel, emner, votering-tema og forslagstekst. Kapitler er oppgitt med tall i budsjettforslag, så budsjettvoteringer får ikke alltid områdemerke. Kan gi både feiltreff og mangler.
3. **Utvalg:** budsjettsaker for to sesjoner (2024–2025, 2025–2026) og områdesaker siden 2013–2014 (`pipeline/config/storting.json`).
4. **Beløp** ligger ikke i Stortingets åpne data utover budsjettvedtakene beskrevet over.

## Kostnadsutvikling
1. **Ingen godkjente tall er publisert.** Kandidater ligger i `data/review/queue/` og venter på manuell gjennomgang. Godkjenning skal gjøres av et menneske mot kilden.
2. **Proposisjoner/meldinger (regjeringen.no) og Bane NOR (banenor.no) er blokkert** for pipelinen. Bare innstillinger fra stortinget.no er gjennomsøkt. Riksrevisjonens rapporter og Statsbygg-dokumenter er ikke koblet automatisk.
3. **Uttrekksheuristikken** finner setninger med nøkkelord, beløp og kostnadsord. Den finner ikke tall i tabeller og bilder, og kan gå glipp av relevante avsnitt.
4. **Årsakskategoriene i køen er gjetninger** fra nøkkelord; kategori settes først ved godkjenning.
