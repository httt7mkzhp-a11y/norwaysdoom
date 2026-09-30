# Plan (steg 1): kilder, hva som virker, hva som er manuelt

Status per 2026-09-30. «Testet» betyr kjørt mot live-API i utviklingsmiljøet denne dagen.

| Del | Kilde | Tilgang | Status | Manuelt? |
|---|---|---|---|---|
| Stortinget: saker, voteringer, stemmer per representant | data.stortinget.no (XML) | API, åpent, NLOD | **Testet og bygget (steg 2)** | Nei. Områdekobling styres av nøkkelord i `pipeline/config/storting.json` |
| Befolkning, BNP, KPI | SSB StatBank (PxWebApi) | API | Skrevet, **feiler med HTTP 400** ved siste kjøring: tabell-id/koder må rettes (steg 3) | Skattytere: manuell/mock |
| Bistand per land/sektor/år | Norad (resultater.norad.no / åpne data) | Nedlasting/API | **Ikke undersøkt** (steg 3) | Trolig delvis manuell |
| Statsbudsjett/statsregnskap for utlandsposter | statsbudsjettet.no, regjeringen.no, DFØ statsregnskapet.no | PDF/HTML/nedlasting | **Ikke undersøkt** (steg 4) | Ja, gjennomgangskø |
| Kostnadsutvikling Follobanen/Regjeringskvartalet | Prop./Innst. S, Riksrevisjonen, Bane NOR, Statsbygg, regjeringen.no | PDF/HTML, ingen API | **Ikke bygget** (steg 5) | Ja: uttrekk til `data/review/`, godkjenning i versjonsstyrt fil |

## Funn om Stortingets API (steg 2)
- `saker`, `voteringer`, `voteringsforslag`, `voteringsresultat`, `partier`, `komiteer`, `representanter` svarer uten nøkkel.
- **Kun personlige voteringer har stemmer per representant.** Av 282 voteringer på budsjettsaker i 2025–2026 var 272 personlige; de øvrige er enstemmig vedtatt og har verken tall (−1) eller resultater.
- Ett voteringsresultat er ca. 220 kB XML og tar ca. 3 s å hente. Første bygg tar derfor lang tid; diskcache (`data/cache/`) gjør senere kjøringer raske.
- Saksoverskrifter for budsjettet er generiske («Statsbudsjettet 2026»). Områdekobling på tittel alene gir få treff; derfor søkes også emner og forslagstekst.
- Stortinget har ingen «ansvarlig»-felt; vi viser bare stemmegivning.

Se [datahull.md](datahull.md) for hull.
