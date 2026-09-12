/* tafelkring.js — waar de tafels in een kring komen te staan.

   Dit is het tegenovergestelde van kring.js. Bij stoelen kies je de maat van de
   kring en worden de stoelen daarover verdeeld. Bij tafels kan dat niet: een
   trapeziumtafel heeft een vaste vorm, dus de tafels bepalen de maat.

   De kring is een gesloten lus. De trapeziumtafels maken de bochten — elke
   bocht draait de lus een vast stuk om — en rechte tafels lopen rechtdoor en
   rekken de zijden op. Zes bochten van zestig graden brengen je rond.

   Twee dingen volgen daaruit en zijn geen keuze:

   - Het aantal bochten ligt vast. Het volgt uit de vorm van de trapeziumtafel;
     alleen zo komt de lus terug op zijn beginpunt.
   - Zijden die tegenover elkaar liggen krijgen evenveel rechte tafels. Anders
     eindigt de lus naast het beginpunt en valt de kring open. Daarom staat er
     in `zijden` één getal per paar tegenover elkaar liggende zijden.

   Een tafel weglaten mag wél per plaats: de overige tafels blijven staan waar
   ze stonden en er valt alleen een gat. Dat staat in `weggelaten`.

   Alle maten in hele centimeters, hoeken in graden. */

const Tafelkring = {

  /* De korte zijde van een trapezium. Een rechthoekige tafel heeft er geen,
     dan zijn beide zijden even lang. */
  korteZijde(meubel) {
    return meubel.korteZijde || meubel.breedte;
  },

  /* Hoeveel graden de lus omgaat bij één trapeziumtafel.

     De helft van het verschil tussen de lange en de korte zijde, gedeeld door
     de diepte, is de tangens van de halve hoek. Een halve zeshoek (160/80/69)
     komt zo op zestig graden uit. Bij een rechthoekige tafel lopen de zijden
     evenwijdig en is er geen hoek; dan geeft deze functie 0. */
  tafelhoek(meubel) {
    const verschil = meubel.breedte - this.korteZijde(meubel);
    if (verschil <= 0 || !meubel.diepte) return 0;
    return 2 * Math.atan(verschil / (2 * meubel.diepte)) * 180 / Math.PI;
  },

  /* Het aantal bochten, en dus het aantal zijden van de kring. Afgerond op een
     heel aantal: de lus moet sluiten, ook als de opgemeten tafel een halve
     graad afwijkt van het ideaal. */
  aantalBochten(meubel) {
    const hoek = this.tafelhoek(meubel);
    if (!hoek) return 4;
    return Math.max(3, Math.min(12, Math.round(360 / hoek)));
  },

  /* Hoeveel tellers het paneel nodig heeft: één per paar tegenover elkaar
     liggende zijden. Bij een oneven aantal zijden bestaan die paren niet en
     krijgen alle zijden hetzelfde aantal. */
  aantalZijden(meubel) {
    const bochten = this.aantalBochten(meubel);
    return bochten % 2 === 0 ? bochten / 2 : 1;
  },

  /* Alle plaatsen in de kring, op volgorde langs de lus, met per plaats het
     meubeltype, waar de tafel komt te staan, hoe ver hij gedraaid is en of hij
     weggelaten is.

     De lus wordt afgelopen langs de buitenrand: elke tafel legt zijn eigen
     breedte af in de richting van dat moment, en bij elke bocht draait de
     richting. Daarna wordt het geheel om zijn eigen midden gelegd, zodat de
     kring draait om het punt waar je hem vastpakt. */
  plaatsen(element) {
    const bochtTafel = Model.meubel(element.meubelId);
    const rechteTafel = element.rechteMeubelId ? Model.meubel(element.rechteMeubelId) : null;

    const bochten = this.aantalBochten(bochtTafel);
    const draai = 360 / bochten;
    const zijden = element.zijden || [];
    const rechtePerZijde = i =>
      rechteTafel && zijden.length ? (zijden[i % zijden.length] || 0) : 0;

    /* De volgorde van de tafels langs de lus, met hun richting.

       De trapeziumtafel ligt schuin in de hoek, precies tussen de twee zijden
       in. Dat is geen opsmuk: zo staan zijn schuine kanten haaks op de zijden,
       en past de rechte tafel er met zijn kopse kant vlak tegenaan. Legde de
       trapeziumtafel in het verlengde van een zijde, dan zou de rechte tafel
       met zijn hoek onder de schuine kant schuiven. */
    const rij = [];
    for (let i = 0; i < bochten; i++) {
      rij.push({ meubel: bochtTafel, soort: "bocht", richting: i * draai - draai / 2 });
      for (let j = 0; j < rechtePerZijde(i); j++) {
        rij.push({ meubel: rechteTafel, soort: "recht", richting: i * draai });
      }
    }

    // de lus aflopen
    let x = 0, y = 0;
    const randen = rij.map(tafel => {
      const r = tafel.richting * Math.PI / 180;
      const dx = Math.cos(r) * tafel.meubel.breedte;
      const dy = Math.sin(r) * tafel.meubel.breedte;
      const rand = Object.assign({}, tafel, { x0: x, y0: y, x1: x + dx, y1: y + dy });
      x += dx; y += dy;
      return rand;
    });

    // het midden van de kring: het gemiddelde van de hoekpunten van de rand
    const midX = randen.reduce((s, r) => s + r.x0, 0) / randen.length;
    const midY = randen.reduce((s, r) => s + r.y0, 0) / randen.length;
    const weg = element.weggelaten || [];

    return randen.map((rand, nummer) => {
      const randMidX = (rand.x0 + rand.x1) / 2 - midX;
      const randMidY = (rand.y0 + rand.y1) / 2 - midY;

      /* De tafel ligt met zijn lange zijde op de rand en steekt naar binnen.
         Welke kant binnen is, bepalen we door te kijken welke van de twee
         dwarsrichtingen naar het midden van de kring wijst. */
      const r = rand.richting * Math.PI / 180;
      const dwarsX = -Math.sin(r), dwarsY = Math.cos(r);
      const naarBinnen = (dwarsX * -randMidX + dwarsY * -randMidY) > 0 ? 1 : -1;

      return {
        nummer,
        meubel: rand.meubel,
        soort: rand.soort,
        weggelaten: weg.includes(nummer),
        x: Math.round(randMidX + dwarsX * naarBinnen * rand.meubel.diepte / 2),
        y: Math.round(randMidY + dwarsY * naarBinnen * rand.meubel.diepte / 2),
        hoek: naarBinnen > 0 ? rand.richting : rand.richting + 180
      };
    });
  },

  /* De buitenmaat van de kring in cm, voor het paneel. Gemeten aan de twee
     buitenhoeken van elke tafel, ook van de weggelaten: de kring houdt zijn
     maat als er een tafel uit is. */
  buitenmaat(element) {
    const plaatsen = this.plaatsen(element);
    if (!plaatsen.length) return { breedte: 0, diepte: 0 };

    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    plaatsen.forEach(t => {
      const r = t.hoek * Math.PI / 180;
      const halve = t.meubel.breedte / 2, diep = t.meubel.diepte / 2;
      [[-halve, -diep], [halve, -diep]].forEach(hoekpunt => {
        const px = t.x + hoekpunt[0] * Math.cos(r) - hoekpunt[1] * Math.sin(r);
        const py = t.y + hoekpunt[0] * Math.sin(r) + hoekpunt[1] * Math.cos(r);
        x0 = Math.min(x0, px); x1 = Math.max(x1, px);
        y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      });
    });
    return { breedte: Math.round(x1 - x0), diepte: Math.round(y1 - y0) };
  },

  /* Hoeveel tafels er werkelijk staan, per meubeltype. Voor de telling. */
  aantallen(element) {
    const uit = {};
    this.plaatsen(element).forEach(t => {
      if (t.weggelaten) return;
      uit[t.meubel.id] = (uit[t.meubel.id] || 0) + 1;
    });
    return uit;
  }
};
