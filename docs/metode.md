# Metode (utkast)

## Stortinget: saker og voteringer
- **Kilde:** data.stortinget.no, NLOD 2.0. Hentet av `pipeline/storting_build.py`, publisert som `public/data/storting/*.json`. Hentedato ligger i `index.json → meta.retrieved_at` og vises på siden.
- **Utvalg:** budsjettsaker (Prop. 1 S og endringer, revidert nasjonalbudsjett, tilleggsbevilgninger/ny saldering) i sesjonene i `pipeline/config/storting.json`, pluss saker knyttet til områdene i samme fil.
- **Hva saken gjaldt:** vises som sakstype (budsjettvedtak, revidert, tillegg, enkeltstående endring, annen sak), sammen med votering-tema, saksnummer (henvisning) og forslagstekst. Utfall er slik Stortinget registrerer det (vedtatt / ikke vedtatt).
- **Stemmer:** for, mot, ikke til stede. Parti først, deretter per representant. Partier sorteres alfabetisk. Ingen rangering, ingen fremheving av enkeltpersoner.
- **Validering:** sum for/mot/ikke til stede over partier må være lik oppgitt antall, og antall representanter lik summen. Ved avvik feiler bygget og eksisterende data beholdes. Bygget feiler også ved mer enn 5 % nedgang i antall saker/voteringer mot forrige uttrekk.
- **Begrensninger:** se [datahull.md](datahull.md).

## Definisjon av «utgift til utlandet»
Ikke fastsatt. Avklares med oppdragsgiver før steg 4 (se spørsmål i rapporten).
