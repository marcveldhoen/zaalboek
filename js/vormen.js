/* vormen.js — hoe iets eruitziet. Waar het staat, bepaalt tekening.js.

   Elke vorm wordt getekend rond het punt (0,0) van de groep waarin hij komt.
   Het verplaatsen en draaien gebeurt met die groep, dus hier staan alleen maten
   ten opzichte van het midden.

   Afspraak voor objecten: de bruikbare kant (klavier, schrijfzijde) wijst naar
   beneden als de hoek 0 is. */

const Vormen = {

  /* De maten die de tekening bij elkaar houden. */
  maat: {
    stoelruimte: 8,       // ruimte tussen tafelrand en stoel
    stoeltussenruimte: 9  // ruimte tussen twee stoelen naast elkaar
  },

  /* De maat van een stoel komt uit het meubeltype "stoel", zodat een andere
     maat in Beheer meteen overal in de tekening doorwerkt. */
  stoelmaat() {
    const m = Model.meubel("stoel");
    return m ? { breedte: m.breedte, diepte: m.diepte } : { breedte: 45, diepte: 45 };
  },

  /* Hart-op-hart afstand tussen twee stoelen naast elkaar, in een rij of kring. */
  rijafstand() {
    return this.stoelmaat().breedte + this.maat.stoeltussenruimte;
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
    const { breedte: B, diepte: D } = this.stoelmaat();
    const lijn = gemarkeerd ? "var(--accent)" : "var(--ink)";
    this.el("rect", { x: -B / 2, y: -D / 2 + 4, width: B, height: D - 4, rx: 7,
      fill: "var(--oak-light)", stroke: lijn, "stroke-width": gemarkeerd ? 5 : 3 }, g);
    // de rugleuning, zodat je ziet welke kant de stoel op staat
    this.el("line", { x1: -B / 2 + 5, y1: -D / 2 + 3, x2: B / 2 - 5, y2: -D / 2 + 3,
      stroke: lijn, "stroke-width": 7, "stroke-linecap": "round" }, g);
  },

  /* Een tafelblad van bovenaf. Rechthoekig, of toelopend als het meubeltype
     `vorm: "trapezium"` heeft. Bij een trapezium ligt de lange zijde aan de
     bovenkant (-y) en de korte aan de onderkant (+y); in een tafelkring wijst
     die korte zijde daardoor naar het midden. */
  tafelblad(g, meubel, gemarkeerd) {
    const b = meubel.breedte, d = meubel.diepte;
    const lijn = gemarkeerd ? "var(--accent)" : "var(--ink)";
    const dikte = gemarkeerd ? 7 : 4;

    if (meubel.vorm === "trapezium") {
      const k = meubel.korteZijde || b;
      const punten = `${-b / 2},${-d / 2} ${b / 2},${-d / 2} ${k / 2},${d / 2} ${-k / 2},${d / 2}`;
      this.el("polygon", { points: punten, fill: "var(--oak)", stroke: lijn,
        "stroke-width": dikte, "stroke-linejoin": "round" }, g);
      return;
    }

    this.el("rect", { x: -b / 2, y: -d / 2, width: b, height: d, rx: 4,
      fill: "var(--oak)", stroke: lijn, "stroke-width": dikte }, g);
  },

  /* De functie van een tafel: een kleed over het blad met een symbool erop.
     Bij een spreektafel staat er een katheder op de tafel in plaats van een kleed.
     Het symbool draait terug, zodat het rechtop blijft staan. */
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
    // de naam van de functie zet teksten.js op een vrije plek
  },

  /* Een verrijdbaar object van bovenaf. Welk symbool, staat bij het meubeltype. */
  object(g, meubel, gemarkeerd) {
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
    // de naam zet teksten.js op een vrije plek
  },

  /* ---------------- vaste objecten van de zaal ---------------- */

  raam(g, o, gemarkeerd) {
    const lijn = gemarkeerd ? "var(--accent)" : "var(--ink)";
    this.el("rect", { x: -o.breedte / 2, y: -o.diepte / 2, width: o.breedte, height: o.diepte,
      fill: "var(--floor)", stroke: lijn, "stroke-width": gemarkeerd ? 6 : 4 }, g);
    this.el("line", { x1: -o.breedte / 2, y1: 0, x2: o.breedte / 2, y2: 0,
      stroke: lijn, "stroke-width": 3 }, g);
  },

  /* Een uitgifteluik: een opening in de muur met een streepjeslijn (het luik),
     en aan de zaalkant (+y) een gearceerde toonbank van o.diepte diep. Wordt
     net als een deur na de muur getekend, zodat de opening erover ligt. */
  uitgifteluik(g, o, gemarkeerd) {
    const b = o.breedte;
    const lijn = gemarkeerd ? "var(--accent)" : "var(--ink)";
    this.el("rect", { x: -b / 2, y: -10, width: b, height: 20, fill: "var(--floor)" }, g);
    [-b / 2, b / 2].forEach(x => this.el("line", { x1: x, y1: -9, x2: x, y2: 9,
      stroke: lijn, "stroke-width": gemarkeerd ? 6 : 4 }, g));
    this.el("line", { x1: -b / 2, y1: 0, x2: b / 2, y2: 0,
      stroke: lijn, "stroke-width": 3, "stroke-dasharray": "10 7" }, g);
    if (o.diepte > 0) {
      this.el("rect", { x: -b / 2, y: 9, width: b, height: o.diepte,
        fill: "url(#arcering)", stroke: lijn, "stroke-width": gemarkeerd ? 6 : 4 }, g);
    }
  },

  beamerscherm(g, o, gemarkeerd) {
    this.el("rect", { x: -o.breedte / 2, y: -o.diepte / 2, width: o.breedte, height: o.diepte,
      fill: "var(--ink)", stroke: gemarkeerd ? "var(--accent)" : "none",
      "stroke-width": gemarkeerd ? 6 : 0 }, g);
  },

  /* Alles wat vast is en geen eigen symbool heeft: keuken, kast, uitgifte.
     De arcering maakt ze ook zonder kleur van meubilair te onderscheiden. */
  vastBlok(g, o, gemarkeerd) {
    const lijn = gemarkeerd ? "var(--accent)" : "var(--ink)";
    this.el("rect", { x: -o.breedte / 2, y: -o.diepte / 2, width: o.breedte, height: o.diepte,
      fill: "url(#arcering)", stroke: lijn, "stroke-width": gemarkeerd ? 6 : 4 }, g);
  },

  /* Een deur met haar draaicirkel. Dat is het snelste oriëntatiepunt op het blad. */
  deur(g, o, gemarkeerd) {
    const w = o.breedte, kant = o.kant;
    const lijn = gemarkeerd ? "var(--accent)" : "var(--ink)";
    this.el("rect", { x: 0, y: -11, width: w, height: 22, fill: "var(--floor)" }, g);
    this.el("path", { d: `M ${w} 0 A ${w} ${w} 0 0 ${kant > 0 ? 1 : 0} 0 ${kant * w}`,
      fill: "none", stroke: "var(--ink-faint)", "stroke-width": 3 }, g);
    this.el("line", { x1: 0, y1: 0, x2: 0, y2: kant * w,
      stroke: lijn, "stroke-width": gemarkeerd ? 9 : 7 }, g);
  },

  /* Het opschrift van een vast object, midden op het object zelf, of op
     hoogte y als het ergens anders moet staan. */
  opschrift(g, tekst, y = 6) {
    const t = this.el("text", { x: 0, y, "text-anchor": "middle",
      "font-size": 26,
      fill: "var(--ink-soft)", "letter-spacing": 1 }, g);
    t.textContent = tekst;
  }
};
