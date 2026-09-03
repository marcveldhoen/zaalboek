/* vormen.js — hoe iets eruitziet. Waar het staat, bepaalt tekening.js.

   Elke vorm wordt getekend rond het punt (0,0) van de groep waarin hij komt.
   Het verplaatsen en draaien gebeurt met die groep, dus hier staan alleen maten
   ten opzichte van het midden.

   Afspraak voor objecten: de bruikbare kant (klavier, schrijfzijde) wijst naar
   beneden als de hoek 0 is. */

const Vormen = {

  /* De maten die de tekening bij elkaar houden. */
  maat: {
    stoel: 45,        // een stoel is vierkant
    stoelruimte: 8,   // ruimte tussen tafelrand en stoel
    rijafstand: 54    // hart-op-hart afstand tussen twee stoelen naast elkaar
  },

  /* Maakt een tekenonderdeel aan. Alle vormen hieronder gebruiken dit. */
  el(naam, kenmerken, ouder) {
    const n = document.createElementNS("http://www.w3.org/2000/svg", naam);
    for (const k in kenmerken) n.setAttribute(k, kenmerken[k]);
    if (ouder) ouder.appendChild(n);
    return n;
  },

  /* ---------------- meubilair ---------------- */

  stoel(g, gemarkeerd) {
    const S = this.maat.stoel;
    const lijn = gemarkeerd ? "var(--accent)" : "var(--ink)";
    this.el("rect", { x: -S / 2, y: -S / 2 + 4, width: S, height: S - 4, rx: 7,
      fill: "var(--oak-light)", stroke: lijn, "stroke-width": gemarkeerd ? 5 : 3 }, g);
    // de rugleuning, zodat je ziet welke kant de stoel op staat
    this.el("line", { x1: -S / 2 + 5, y1: -S / 2 + 3, x2: S / 2 - 5, y2: -S / 2 + 3,
      stroke: lijn, "stroke-width": 7, "stroke-linecap": "round" }, g);
  },

  tafelblad(g, meubel, gemarkeerd) {
    this.el("rect", { x: -meubel.breedte / 2, y: -meubel.diepte / 2,
      width: meubel.breedte, height: meubel.diepte, rx: 4,
      fill: "var(--oak)", stroke: gemarkeerd ? "var(--accent)" : "var(--ink)",
      "stroke-width": gemarkeerd ? 7 : 4 }, g);
  },

  /* De functie van een tafel: een kleed over het blad met een symbool erop.
     Bij een spreektafel staat er een katheder op de tafel in plaats van een kleed.
     Het symbool en de naam draaien terug, zodat ze rechtop blijven staan. */
  tafelfunctie(g, element, meubel) {
    const functie = element.functie;
    if (!functie || functie === "geen") return;

    const b = meubel.breedte, d = meubel.diepte;

    if (functie === "koffie" || functie === "eten") {
      this.el("rect", { x: -b / 2 + 7, y: -d / 2 + 7, width: b - 14, height: d - 14, rx: 2,
        fill: "#EFE9DC", stroke: "var(--ink)", "stroke-width": 2.5 }, g);

      const c = this.el("g", { transform: `rotate(${-element.hoek})`,
        fill: "none", stroke: "var(--ink)", "stroke-width": 4.5,
        "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      this.el("circle", { cx: 0, cy: 0, r: 29, fill: "var(--floor)",
        stroke: "var(--ink)", "stroke-width": 3.5 }, c);

      if (functie === "koffie") {
        this.el("path", { d: "M -13 -10 h 21 v 12 a 10 10 0 0 1 -21 0 z" }, c);
        this.el("path", { d: "M 8 -6 a 8 8 0 0 1 0 11" }, c);
        this.el("line", { x1: -16, y1: 13, x2: 13, y2: 13 }, c);
      } else {
        this.el("circle", { cx: 1, cy: 0, r: 11 }, c);
        this.el("line", { x1: -15, y1: -11, x2: -15, y2: 11 }, c);
        this.el("line", { x1: 16, y1: -11, x2: 16, y2: 11 }, c);
        this.el("line", { x1: -19, y1: -11, x2: -19, y2: -3 }, c);
        this.el("line", { x1: -11, y1: -11, x2: -11, y2: -3 }, c);
      }
    }

    if (functie === "spreek") {
      // katheder op de tafel, gericht naar dezelfde kant als de stoelen
      this.el("path", { d: "M -32 -13 h 64 l -7 26 h -50 z",
        fill: "var(--wood)", stroke: "var(--ink)", "stroke-width": 4,
        "stroke-linejoin": "round" }, g);
      this.el("line", { x1: -25, y1: -6, x2: 25, y2: -6,
        stroke: "#E8DFCE", "stroke-width": 4, "stroke-linecap": "round" }, g);
    }

    const tekst = functie === "spreek" ? "Spreektafel"
                : functie === "koffie" ? "Koffie en thee"
                : "Eten en buffet";
    this.naamNaastVorm(g, tekst, Math.max(b, d) / 2 + 36, element.hoek, 26);
  },

  /* Een verrijdbaar object van bovenaf. Welk symbool, staat bij het meubeltype. */
  object(g, meubel, gemarkeerd, hoek) {
    const b = meubel.breedte, d = meubel.diepte;
    const stroke = gemarkeerd ? "var(--accent)" : "var(--ink)";
    const sw = gemarkeerd ? 7 : 4;

    if (meubel.symbool === "klavier" || meubel.symbool === "klavierOrgel") {
      const klavierH = 17, kastH = d - klavierH;

      this.el("rect", { x: -b / 2, y: -d / 2, width: b, height: kastH,
        fill: "var(--wood)", stroke, "stroke-width": sw }, g);

      // het klavier aan de voorzijde, zodat je ziet aan welke kant de speler zit
      this.el("rect", { x: -b / 2 + 11, y: -d / 2 + kastH, width: b - 22, height: klavierH,
        fill: "#F4F1E8", stroke, "stroke-width": 3 }, g);
      const n = Math.round((b - 22) / 11);
      for (let i = 1; i < n; i++) {
        const x = -b / 2 + 11 + i * (b - 22) / n;
        this.el("line", { x1: x, y1: -d / 2 + kastH + 2, x2: x, y2: -d / 2 + kastH + klavierH - 2,
          stroke: "var(--ink)", "stroke-width": 1.6 }, g);
      }

      if (meubel.symbool === "klavierOrgel") {
        // registerlijst langs de achterzijde
        this.el("rect", { x: -b / 2 + 14, y: -d / 2 + 7, width: b - 28, height: 10,
          fill: "#E6DBC9", stroke: "var(--ink)", "stroke-width": 2 }, g);
      }

    } else {
      const paneelH = 13, voetX = b / 2 - 26;

      // onderstel met wieltjes
      [-voetX, voetX].forEach(vx => {
        this.el("rect", { x: vx - 5, y: -d / 2 + 6, width: 10, height: d - paneelH - 10,
          fill: "var(--slate)", stroke: "var(--ink)", "stroke-width": 2.5 }, g);
        this.el("circle", { cx: vx, cy: -d / 2 + 8, r: 7,
          fill: "#EDECE6", stroke: "var(--ink)", "stroke-width": 2.5 }, g);
        this.el("circle", { cx: vx, cy: d / 2 - paneelH - 6, r: 7,
          fill: "#EDECE6", stroke: "var(--ink)", "stroke-width": 2.5 }, g);
      });

      // het bord zelf: donker bij een scherm, licht bij een whiteboard
      this.el("rect", { x: -b / 2, y: d / 2 - paneelH, width: b, height: paneelH,
        fill: meubel.symbool === "bordDonker" ? "var(--ink)" : "#F7F6F2",
        stroke, "stroke-width": sw }, g);
    }

    this.naamNaastVorm(g, meubel.naam, Math.max(b, d) / 2 + 38, hoek, 27);
  },

  /* ---------------- vaste objecten van de zaal ---------------- */

  raam(g, o) {
    this.el("rect", { x: -o.breedte / 2, y: -o.diepte / 2, width: o.breedte, height: o.diepte,
      fill: "var(--floor)", stroke: "var(--ink)", "stroke-width": 4 }, g);
    this.el("line", { x1: -o.breedte / 2, y1: 0, x2: o.breedte / 2, y2: 0,
      stroke: "var(--ink)", "stroke-width": 3 }, g);
  },

  beamerscherm(g, o) {
    this.el("rect", { x: -o.breedte / 2, y: -o.diepte / 2, width: o.breedte, height: o.diepte,
      fill: "var(--ink)", stroke: "none" }, g);
  },

  /* Alles wat vast is en geen eigen symbool heeft: keuken, kast, uitgifte.
     De arcering maakt ze ook zonder kleur van meubilair te onderscheiden. */
  vastBlok(g, o) {
    this.el("rect", { x: -o.breedte / 2, y: -o.diepte / 2, width: o.breedte, height: o.diepte,
      fill: "url(#arcering)", stroke: "var(--ink)", "stroke-width": 4 }, g);
  },

  /* Een deur met haar draaicirkel. Dat is het snelste oriëntatiepunt op het blad. */
  deur(g, o) {
    const w = o.breedte, kant = o.kant;
    this.el("rect", { x: 0, y: -11, width: w, height: 22, fill: "var(--floor)" }, g);
    this.el("path", { d: `M ${w} 0 A ${w} ${w} 0 0 ${kant > 0 ? 1 : 0} 0 ${kant * w}`,
      fill: "none", stroke: "var(--ink-faint)", "stroke-width": 3 }, g);
    this.el("line", { x1: 0, y1: 0, x2: 0, y2: kant * w,
      stroke: "var(--ink)", "stroke-width": 7 }, g);
  },

  /* Het opschrift van een vast object, midden op het object zelf. */
  opschrift(g, tekst) {
    const t = this.el("text", { x: 0, y: 6, "text-anchor": "middle",
      "font-family": "Archivo, sans-serif", "font-size": 26,
      fill: "var(--ink-soft)", "letter-spacing": 1 }, g);
    t.textContent = tekst;
  },

  /* ---------------- gedeeld ---------------- */

  /* Een naam onder een vorm. De tegendraaiing houdt hem horizontaal,
     ook als het object gedraaid is. */
  naamNaastVorm(g, tekst, afstand, hoek, grootte) {
    const t = this.el("text", { x: 0, y: 0, "text-anchor": "middle",
      "font-family": "Archivo, sans-serif", "font-size": grootte,
      fill: "var(--ink-soft)",
      transform: `rotate(${-hoek}) translate(0 ${afstand})` }, g);
    t.textContent = tekst;
  }
};
