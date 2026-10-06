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
