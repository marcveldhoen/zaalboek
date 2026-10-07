# Zaalboek

Een webapplicatie (gewone HTML, CSS en JavaScript, zonder bouwstap) om
zaalopstellingen te tekenen: tafels, stoelen en objecten in een plattegrond.
Gebouwd voor de koster van een kerk, als vervanging van een verouderde
papieren plattegrondenmap, en als PDF af te drukken. Marc en de koster
gebruiken de applicatie elk op hun eigen computer; een tablet wordt alleen
gebruikt om de geprinte PDF te bekijken. De applicatie moet ongeveer drie
jaar onderhoudbaar blijven door mensen zonder technische achtergrond.

De gegevens staan niet in deze repository maar in het bestand `zaalboek.json`
in de privé-opslagplaats `marcveldhoen/zaalboek-gegevens`; `js/opslag.js` haalt
dat op en bewaart het via de GitHub-API, met een fine-grained toegangstoken
dat beide gebruikers delen. De sleutel daarvoor staat alleen in de browser
(localStorage) en nooit in de code.

Sinds 6 oktober 2026 gebeurt het bouwen in Claude Code, op Marcs eigen
computer. Projectmap lokaal: `~/Documents/zaalboek`.

## Architectuur

- Gewone `<script src>`-tags. Geen framework en geen bouwstap, zodat de app
  werkt als GitHub Pages-site én als je `index.html` direct vanaf schijf
  opent.
- **Eén `tekening.js` tekent het tekenscherm, het kijkscherm, scherm 6 (zaal
  inrichten) én het printblad (`css/blad.css`).** Daardoor kan het scherm
  nooit iets anders tonen dan het papier.
- Zaalvormen worden opgeslagen als ingevoerde maten, niet als hoekpunten;
  `zaalvorm.js` rekent de omtrek uit tijdens het tekenen.
- Slepen werkt alleen de versleepte positie bij. Automatisch opslaan gebeurt
  twee seconden na de laatste wijziging, niet bij elke toetsaanslag en niet
  met een knop.
- Bij botsingen (iemand anders wijzigde ondertussen) of mislukt laden komt
  er een blokkerende melding, nooit een stille overschrijving.
- Symbolen hebben expliciete namen (`bordDonker`, `bordLicht`, `klavier`,
  `klavierOrgel`). Elementen hebben geen eigen ID, ze worden herkend aan hun
  plaats in de lijst.
- Trapeziumtafels krijgen een eigen elementtype `tafelkring` en worden niet
  aangepast uit de stoelenkring: een trapezium heeft een vaste hoek, dus het
  aantal tafels bepaalt de straal.
- Scherm 6 (zaal inrichten) opent altijd leeg — nooit het meubilair van het
  tekenscherm hergebruiken, na een eerdere bug waarbij dat per ongeluk
  gebeurde.
- Afgewezen: een losse server (een Cloudflare Worker) voor opslag. GitHub
  levert botsingsbeveiliging en geschiedenis gratis mee; dat zou anders zelf
  geschreven moeten worden, naast een kwetsbare extra koppeling.
- Er is een werkend prototype, `docs/zaalboek-tekenmotor.html` (lokaal,
  genegeerd door git, bevat echte zaalnamen). Valideer een nieuwe
  tekenkeuze ertegen voor je hem definitief maakt.

## Werkwijze

- Werk als developer: bouw door, blokkeer niet op ontbrekende gegevens en
  vraag niet eerst om metingen. Adviseer wel als iets beter op een ander
  moment kan, maar als advies, niet als voorwaarde.
- Bouw in benoemde bouwstappen met een duidelijke afbakening. De
  bouwvolgorde en de huidige stand staan in `OVERDRACHT.md` in
  `zaalboek-gegevens` (zie hieronder).
- Test eerst programmatisch en in de browser (zie "Veilig testen"
  hieronder) voor je iets oplevert.

## Afspraken

- **Na elke afgeronde wijziging**: maak een commit met een korte, duidelijke
  Nederlandse omschrijving (bijvoorbeeld "Draaiknop toegevoegd aan
  tekenscherm") en push naar de branch `main` op GitHub.
- **Commit nooit persoonsgegevens, wachtwoorden of sleutels.** Deze repository
  is openbaar. Dat betekent:
  - geen `zaalboek.json` of andere gegevensbestanden met zalen, namen of
    opstellingen;
  - geen `.env`-bestanden, API-sleutels, GitHub-tokens (`github_pat_...`),
    wachtwoorden of certificaten — ook niet in de code, in commentaar of in
    een commitbericht;
  - controleer vóór elke commit met `git status` en `git diff --staged` wat er
    meegaat. Twijfel je, commit dan niet en vraag het eerst.
- Schrijf code, commentaar en namen in het Nederlands, net als de bestaande code.
- **Sluit elke sessie af met een logboekregel** in `OVERDRACHT.md` in
  `zaalboek-gegevens` (zie hieronder) — niet in deze repository.
- Wijken die overdracht en het logboek af van wat er, blijkens de
  commitgeschiedenis, al gebouwd is — bijvoorbeeld een gat tussen het
  logboek en de commits — vraag dan eerst welke volgende stap bedoeld is
  voor je bouwt.

## De map zaalboek-gegevens

Naast deze map staat `~/Documents/zaalboek-gegevens`, de aparte, privé
opslagplaats met de daadwerkelijke gegevens (zalen, namen, opstellingen) én
de projectoverdracht.

- De gegevens horen **nooit** in deze openbare repository, ook niet als
  voorbeeld of testgegevens.
- **Lees bij het begin van een sessie eerst `OVERDRACHT.md` in
  `zaalboek-gegevens`**, als het bestaat: de stand van zaken, de volgende
  stappen en het logboek staan daar, met de echte zaalnamen — bewust niet in
  deze openbare repository. Doel, architectuur en werkwijze staan hierboven.
- Wil je iets wijzigen in `zaalboek.json` (de zalen, namen of
  opstellingen zelf), toon dan eerst precies welke wijziging je van plan
  bent en wacht op akkoord voordat je iets aanpast. Voor `OVERDRACHT.md` in
  diezelfde map geldt dat niet: de stand van zaken bijwerken, een volgende
  stap aanpassen of een logboekregel toevoegen mag zonder dat akkoord, als
  onderdeel van het afsluiten van een sessie.
- Commit en push wijzigingen in die map (gegevens én `OVERDRACHT.md`) in die
  map zelf (`git -C ~/Documents/zaalboek-gegevens ...`), niet in deze
  repository.
- Voor wijzigingen aan de code van de app blijven de afspraken hierboven
  gelden.

## Veilig testen

Wil je een wijziging in de browser proberen, test dan nooit rechtstreeks
tegen de echte opslagplaats `zaalboek-gegevens`. Gebruik een lokale
testopstelling:

- `test-lokaal.html` — een kopie van `index.html` die `Opslag.adres()`
  omleidt naar een lokale nep-opslagserver, vóórdat `js/app.js` draait. Dit
  bestand staat in `.gitignore` en wordt nooit gecommit.
- Een losse, lokale node-server die alleen een kopie van de gegevens serveert
  (bijvoorbeeld op `localhost:8745`) — nooit het echte bestand zelf.

Overschrijf nooit achteraf, bijvoorbeeld via de devtools-console, de
opslagfuncties van een al geladen `index.html`: dat gaf eerder een race
tussen een paginaherlaad en de overschrijving, waardoor gegevens in
`zaalboek-gegevens` verloren gingen. Richt de omleiding altijd in vóórdat de
pagina laadt, zoals in `test-lokaal.html`.
