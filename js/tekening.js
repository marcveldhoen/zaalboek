/* tekening.js — waar alles komt te staan.

   Dit bestand wordt gebruikt door het tekenscherm, het bekijkscherm én het
   geprinte blad. Daarom staat er niets in over slepen, kiezen of knoppen: het
   tekent alleen. Zo kan het blad nooit iets anders tonen dan het scherm.

   Hoe iets eruitziet staat in vormen.js. */

const Tekening = {

  el: Vormen.el.bind(Vormen),

  /* Het kader van de zaal, gebruikt om de tekening passend in beeld te zetten. */
  kader(zaal) {
    return Zaalvorm.kader(Zaalvorm.omtrek(zaal.vorm));
  },

  /* ---------------- de zaal ----------------
     doelen: { raster, ruimte, vast, schaalstok } — vier lege groepen. */
  zaal(zaal, doelen) {
    const omtrek = Zaalvorm.omtrek(zaal.vorm);
    const k = Zaalvorm.kader(omtrek);

    this.raster(doelen.raster, k);
    this.vloer(doelen.ruimte, omtrek, k, zaal.naam);
    this.vasteObjecten(doelen.vast, zaal.vasteObjecten || []);
    this.schaalstok(doelen.schaalstok, k);
  },

  raster(doel, k) {
    doel.innerHTML = "";
    const M = 140;                                  // hoe ver het raster buiten de zaal doorloopt
    for (let x = k.x0 - M; x <= k.x1 + M; x += 50) {
      this.el("line", { x1: x, y1: k.y0 - M, x2: x, y2: k.y1 + M,
        stroke: "#D2D1C8", "stroke-width": (x % 100 ? .8 : 1.6) }, doel);
    }
    for (let y = k.y0 - M; y <= k.y1 + M; y += 50) {
      this.el("line", { x1: k.x0 - M, y1: y, x2: k.x1 + M, y2: y,
        stroke: "#D2D1C8", "stroke-width": (y % 100 ? .8 : 1.6) }, doel);
    }
  },

  vloer(doel, omtrek, k, naam) {
    doel.innerHTML = "";
    const punten = omtrek.map(p => p.join(",")).join(" ");

    // eerst een dikke lijn als muur, daarna de vloer eroverheen tot aan de binnenkant
    this.el("polygon", { points: punten, fill: "var(--floor)", stroke: "var(--ink)",
      "stroke-width": 18, "stroke-linejoin": "miter" }, doel);
    this.el("polygon", { points: punten, fill: "var(--floor)", stroke: "none" }, doel);

    const t = this.el("text", { x: k.x0 + 40, y: k.y0 + 90, fill: "#C6C3B8",
      "font-family": "Newsreader, Georgia, serif", "font-size": 72 }, doel);
    t.textContent = naam;
  },

  vasteObjecten(doel, objecten) {
    doel.innerHTML = "";

    // deuren als laatste: hun vloerstrook moet over de muur heen liggen
    const volgorde = objecten.filter(o => o.soort !== "deur")
                       .concat(objecten.filter(o => o.soort === "deur"));

    volgorde.forEach(o => {
      const g = this.el("g", { transform: `translate(${o.x} ${o.y}) rotate(${o.hoek})` }, doel);

      if (o.soort === "deur")        Vormen.deur(g, o);
      else if (o.soort === "raam")   Vormen.raam(g, o);
      else if (o.soort === "scherm") Vormen.beamerscherm(g, o);
      else                           Vormen.vastBlok(g, o);

      if (o.opschrift) Vormen.opschrift(g, o.opschrift);
    });
  },

  schaalstok(doel, k) {
    doel.innerHTML = "";
    const x = k.x0, y = k.y1 + 80;

    this.el("line", { x1: x, y1: y, x2: x + 500, y2: y,
      stroke: "var(--ink-soft)", "stroke-width": 3 }, doel);
    for (let i = 0; i <= 5; i++) {
      this.el("line", { x1: x + i * 100, y1: y - 9, x2: x + i * 100, y2: y + 9,
        stroke: "var(--ink-soft)", "stroke-width": 3 }, doel);
    }
    const t = this.el("text", { x: x + 510, y: y + 10, fill: "var(--ink-faint)",
      "font-family": "Archivo, sans-serif", "font-size": 30 }, doel);
    t.textContent = "5 meter";
  },

  /* ---------------- het meubilair ----------------
     geselecteerd is het element dat aangewezen is, of null bij het blad. */
  elementen(opstelling, doel, geselecteerd) {
    doel.innerHTML = "";
    opstelling.elementen.forEach((element, volgnummer) => {
      this.element(element, doel, volgnummer, element === geselecteerd);
    });
  },

  element(element, doel, volgnummer, gemarkeerd) {
    /* Het volgnummer staat in de tekening zodat het scherm van een aangeklikte
       vorm terug kan vinden om welk element het gaat. De tekening wordt na elke
       wijziging opnieuw gemaakt, dus het nummer klopt altijd. */
    const g = this.el("g", {
      transform: `translate(${element.x} ${element.y}) rotate(${element.hoek})`,
      "data-volgnummer": volgnummer,
      style: "cursor:move"
    }, doel);

    if (element.type === "tafel")       this.tafel(g, element, gemarkeerd);
    else if (element.type === "stoel")  Vormen.stoel(g, gemarkeerd);
    else if (element.type === "rij")    this.rij(g, element, gemarkeerd);
    else if (element.type === "kring")  this.kring(g, element, gemarkeerd);
    else if (element.type === "tafelkring") this.tafelkring(g, element, gemarkeerd);
    else if (element.type === "object") Vormen.object(g, Model.meubel(element.meubelId), gemarkeerd, element.hoek);

    return g;
  },

  tafel(g, element, gemarkeerd) {
    const meubel = Model.meubel(element.meubelId);
    const b = meubel.breedte, d = meubel.diepte;
    const afstand = Vormen.maat.stoelruimte + Vormen.maat.stoel / 2;
    const s = element.stoelen;

    /* Per zijde: hoeveel stoelen, over welke lengte ze verdeeld worden, hoe ver
       van het midden ze staan, en welke kant ze op kijken. */
    const zijden = [
      { n: s.boven,  lengte: b, afstand: -d / 2 - afstand, langs: "x", hoek: 0 },
      { n: s.onder,  lengte: b, afstand:  d / 2 + afstand, langs: "x", hoek: 180 },
      { n: s.links,  lengte: d, afstand: -b / 2 - afstand, langs: "y", hoek: 270 },
      { n: s.rechts, lengte: d, afstand:  b / 2 + afstand, langs: "y", hoek: 90 }
    ];

    zijden.forEach(z => {
      for (let i = 0; i < z.n; i++) {
        const p = z.lengte * (i + 0.5) / z.n - z.lengte / 2;   // gelijk verdeeld over de zijde
        const x = z.langs === "x" ? p : z.afstand;
        const y = z.langs === "x" ? z.afstand : p;
        const sg = this.el("g", { transform: `translate(${x} ${y}) rotate(${z.hoek})` }, g);
        Vormen.stoel(sg, gemarkeerd);
      }
    });

    Vormen.tafelblad(g, meubel, gemarkeerd);
    Vormen.tafelfunctie(g, element, meubel);
  },

  rij(g, element, gemarkeerd) {
    for (let i = 0; i < element.n; i++) {
      const p = Vormen.maat.rijafstand * (i - (element.n - 1) / 2);
      const sg = this.el("g", { transform: `translate(${p} 0)` }, g);
      Vormen.stoel(sg, gemarkeerd);
    }
  },

  kring(g, element, gemarkeerd) {
    Kring.posities(element).forEach(p => {
      const sg = this.el("g", { transform: `translate(${p.x} ${p.y}) rotate(${p.hoek})` }, g);
      Vormen.stoel(sg, gemarkeerd);
    });
  },

  /* Een kring van tafels. De stoelen staan aan de buitenkant, want de tafels
     staan met hun korte zijde tegen elkaar en laten binnen geen ruimte. Waar de
     tafels komen te staan, rekent tafelkring.js uit. */
  tafelkring(g, element, gemarkeerd) {
    const meubel = Model.meubel(element.meubelId);
    const afstand = Vormen.maat.stoelruimte + Vormen.maat.stoel / 2;

    Tafelkring.posities(element).forEach(p => {
      const tg = this.el("g", { transform: `translate(${p.x} ${p.y}) rotate(${p.hoek})` }, g);

      // eerst de stoelen, dan het blad eroverheen — net als bij een gewone tafel
      for (let i = 0; i < (element.stoelen || 0); i++) {
        const x = meubel.breedte * (i + 0.5) / element.stoelen - meubel.breedte / 2;
        const sg = this.el("g", { transform: `translate(${x} ${-meubel.diepte / 2 - afstand})` }, tg);
        Vormen.stoel(sg, gemarkeerd);
      }

      Vormen.tafelblad(tg, meubel, gemarkeerd);
    });
  }
};
