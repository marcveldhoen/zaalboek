# Zaalboek

Een webapplicatie (gewone HTML, CSS en JavaScript, zonder bouwstap) om
zaalopstellingen te tekenen: tafels, stoelen en objecten in een plattegrond.
De gegevens staan niet in deze repository maar in het bestand `zaalboek.json`
in de privé-opslagplaats `marcveldhoen/zaalboek-gegevens`; `js/opslag.js` haalt
dat op en bewaart het via de GitHub-API. De sleutel daarvoor staat alleen in de
browser (localStorage) en nooit in de code.

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

## De map zaalboek-gegevens

Naast deze map staat `~/Documents/zaalboek-gegevens`, de aparte, privé
opslagplaats met de daadwerkelijke gegevens (zalen, namen, opstellingen).

- De gegevens horen **nooit** in deze openbare repository, ook niet als
  voorbeeld of testgegevens.
- Wil je iets wijzigen in de gegevens, toon dan eerst precies welke wijziging
  je van plan bent en wacht op akkoord voordat je iets aanpast.
- Commit en push gegevenswijzigingen pas na akkoord, en doe dat in die map
  zelf (`git -C ~/Documents/zaalboek-gegevens ...`), niet in deze repository.
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

## OVERDRACHT.md

Als er een bestand `OVERDRACHT.md` in deze map staat, lees dat dan eerst: het
bevat de projectoverdracht (doel, ontwerpbeslissingen, stand van zaken,
volgende stappen) uit een eerdere sessie. Dat bestand staat in `.gitignore`
en wordt nooit gecommit — de inhoud ervan hoort niet in dit openbare
CLAUDE.md.
