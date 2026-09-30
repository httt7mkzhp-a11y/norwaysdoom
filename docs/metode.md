# Metode

## Definisjon: hva teller som «utgift til utlandet»?
**Standardvalg (utkast, manuelt kuratert).** Det finnes ingen offisiell liste. Vi har valgt: *vedtatte poster i statsbudsjettets utgiftsdel (Prop. 1 S) som er overføringer til mottakere utenfor Norge.* Reglene (kapittel/post → kategori) ligger i [`pipeline/config/definition.json`](../pipeline/config/definition.json), er kontrollert mot budsjettårene 2025 og 2026, og vises post for post på siden Kategorier. Endres definisjonen, endres tallene; ingen tall er skrevet inn for hånd.

| Kategori | Poster (2026-budsjettet) | Type | Binding |
|---|---|---|---|
| Humanitær bistand | kap. 150 (i 2025 også kap. 153) | tilskudd | politisk vedtatt |
| Fred, sikkerhet og menneskerettigheter | kap. 151 (unntatt post 74), 152 | tilskudd | politisk vedtatt |
| Utviklingssamarbeid (regional/tematisk) | kap. 159 (unntatt post 73), 160, 161, 162, 164, 165, 170, 172.73 | tilskudd; kap. 165: risikokapital | politisk vedtatt |
| Miljø og klima | kap. 163 | tilskudd | politisk vedtatt |
| Ukraina-støtte (Nansen) | 159.73, 165.72, 1750.79 (2025: 1700.79) | tilskudd/kapital | politisk vedtatt |
| Multilaterale organisasjoner | kap. 171, 172 (unntatt 73) | tilskudd | politisk vedtatt |
| Pliktige bidrag | 116.70, 151.74 | kontingent | **pliktig** (postnavn) |
| EØS-finansieringsordningene | 117.79, 117.80 (2025: 117.77, 117.78) | tilskudd | **avtalefestet** (manuell klassifisering) |
| NATO | 1700.53/78 (2025: 1700.90/78), 1760.75 | medlemskap/kapital | **traktatfestet** (manuell klassifisering) |

**Gaver vs. lån:** budsjettet skiller ikke gave og lån på postnivå utover postnavnet. Vi merker *tilskudd* (gave), *kapitalinnskudd/risikokapital* og *medlemskap/kontingent*. Lån (utlån) forekommer ikke som utgiftsposter i avgrensningen.

**Lovpålagt/avtalefestet vs. frivillig:** «pliktige bidrag» leses fra postnavnet. EØS (avtalefestet) og NATO (medlemskap) er klassifisert manuelt og merket som det. Øvrige poster er politisk vedtatt uten ekstern binding *etter postens ordlyd*. Vi har ikke vurdert folkerettslige forpliktelser utover dette.

**Utelatt:** drift av utenrikstjenesten (kap. 100–105), kultur/næringsfremme (115), utenrikspolitiske tilskudd (118), forvaltning (140–144), flyktningutgifter i Norge (179), Forsvarets drift og investeringer i Norge, og kap. 1750 post 21 (kan nyttes under post 79; 28,6 mrd. kr i 2026, utelatt for å unngå dobbelttelling). Utelatte poster i UD/FD-kapitler vises på siden.

**Sikring mot feil:** regler som forventer et bestemt postnavn feiler om navnet endres; enhver bistandspost (kap. 150–172) uten regel gir feil. Nye budsjettår må derfor gjennomgås før de publiseres.

## Telleren
Sum av vedtatte poster i avgrensningen for året (opprinnelig vedtak i desember året før), delt jevnt over sekundene i året (Europe/Oslo). **Fordeling av budsjettvedtak, ikke sanntidstransaksjoner.** Revidert nasjonalbudsjett og tilleggsbevilgninger er ikke innarbeidet.

## Utbetalt (kart og historikk)
OECD DAC: netto utbetalinger av ODA (bilateral per mottakerland; multilateral kjernebidrag; flyktningutgifter i Norge som egen post, ikke med i «til utlandet»). ODA-avgrensningen er OECDs og er *ikke* lik statsbudsjettets poster; tallene er derfor ikke direkte sammenlignbare med vedtatt budsjett. **Omregning:** DAC2A oppgir USD; vi bruker OECDs implisitte årskurs (totalt netto ODA i NOK / i USD, DAC1) slik at summen stemmer med OECDs norske totaler (kontrollert mot DAC1 med toleranse 0,2 %).

## Løpende og faste kroner
Alle beløp lagres i løpende kroner. Faste kroner bruker SSBs KPI (tabell 03013, årsgjennomsnitt av 12 måneder, 2015=100); basisåret er siste hele år. År uten KPI har ikke faste kroner.

## Stortinget: saker og voteringer
- **Kilde:** data.stortinget.no, NLOD 2.0. `pipeline/storting_build.py` → `public/data/storting/*.json`.
- **Utvalg:** budsjettsaker (Prop. 1 S og endringer, revidert nasjonalbudsjett, tilleggsbevilgninger/ny saldering) i sesjonene i `pipeline/config/storting.json`, pluss saker knyttet til områdene (nøkkelord).
- **Hva saken gjaldt:** sakstype, votering-tema, saksnummer, forslag og utfall slik Stortinget registrerer det.
- **Stemmer:** for, mot, ikke til stede. Parti først (alfabetisk), deretter per representant. Ingen rangering. Stemmegivning sier ikke hvem som er ansvarlig for et utfall utover selve stemmen.
- **Validering:** partisummer mot oppgitt antall; ved avvik feiler bygget. Feiler også ved > 5 % nedgang i antall saker/voteringer mot forrige uttrekk.

## Kostnadsutvikling
Se [prosjekter.md](prosjekter.md). Kun manuelt godkjente tall publiseres; hvert tall har dokument, side og sitat som kontrolleres mot kilden.

## Hull og begrensninger
Se [datahull.md](datahull.md).
