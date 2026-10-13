/* teksten.js — waar de namen en opschriften in de tekening komen te staan.

   Een tekst (Piano, Spreektafel, Kast, Uitgifte) hoort bij een object, maar
   mag niet over ander meubilair vallen. Daarom zoekt elke tekst de
   dichtstbijzijnde vrije plek rond zijn object: eerst eronder, dan erboven,
   rechts, links en schuin, eerst vlakbij en daarna steeds iets verder weg.
   Staat hij verder weg, dan wijst een stippellijntje naar het object.

   Alles wordt uitgerekend met rechthoeken in zaalcentimeters, niet gemeten
   in de browser. Zo komt de tekst op het scherm, in de kleine tegels en op
   het printblad op precies dezelfde plek. */

const Teksten = {

  /* Hoe ver een tekst van zijn object mag komen te staan, op volgorde. */
  afstanden: [10, 45, 90],

  /* Ruimte tussen een tekst en de muur. */
  muurmarge: 14,

  /* ---------------- rechthoeken ----------------
     Een rechthoek is { x0, y0, x1, y1 } in zaalcentimeters, recht (niet
     gedraaid). Een gedraaide vorm wordt de rechthoek die er precies omheen past. */

  /* Een rechthoek in het eigen assenstelsel van een vorm, naar de zaal.
     standen: lijst van { x, y, hoek }, binnenste eerst. */
  naarZaal(lokaal, standen) {
    let punten = [[lokaal.x0, lokaal.y0], [lokaal.x1, lokaal.y0],
                  [lokaal.x1, lokaal.y1], [lokaal.x0, lokaal.y1]];
    standen.forEach(s => {
      const r = (s.hoek || 0) * Math.PI / 180, c = Math.cos(r), z = Math.sin(r);
      punten = punten.map(([x, y]) => [s.x + x * c - y * z, s.y + x * z + y * c]);
    });
    const xs = punten.map(p => p[0]), ys = punten.map(p => p[1]);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  },

  rondom(b, d) {
    return { x0: -b / 2, y0: -d / 2, x1: b / 2, y1: d / 2 };
  },

  overlapt(a, b) {
    return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  },

  /* Hoeveel vierkante centimeter twee rechthoeken elkaar bedekken. */
  overlapping(a, b) {
    const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    return w > 0 && h > 0 ? w * h : 0;
  },

  /* ---------------- wat er in de zaal staat ---------------- */

  /* De rechthoeken die een element inneemt, in de zaal. Een tafel telt mee
     met de stoelen eromheen, want ook daar hoort geen tekst. */
  vanElement(e) {
    const stand = [{ x: e.x, y: e.y, hoek: e.hoek }];
    const stoel = Vormen.stoelmaat();
    const rand = Vormen.maat.stoelruimte + stoel.diepte;

    if (e.type === "tafel") {
      const m = Model.meubel(e.meubelId), s = e.stoelen;
      const lokaal = this.rondom(m.breedte, m.diepte);
      if (s.boven)  lokaal.y0 -= rand;
      if (s.onder)  lokaal.y1 += rand;
      if (s.links)  lokaal.x0 -= rand;
      if (s.rechts) lokaal.x1 += rand;
      return [this.naarZaal(lokaal, stand)];
    }
    if (e.type === "stoel") return [this.naarZaal(this.rondom(stoel.breedte, stoel.diepte), stand)];
    if (e.type === "rij") {
      const lengte = Vormen.rijafstand() * (e.n - 1) + stoel.breedte;
      return [this.naarZaal(this.rondom(lengte, stoel.diepte), stand)];
    }
    if (e.type === "kring") {
      const ry = e.vorm === "ovaal" ? e.ry : e.rx;
      return [this.naarZaal(this.rondom(2 * e.rx + stoel.diepte, 2 * ry + stoel.diepte), stand)];
    }
    if (e.type === "tafelkring") {
      return Tafelkring.plaatsen(e).filter(p => !p.weggelaten).map(p => {
        const lokaal = this.rondom(p.meubel.breedte, p.meubel.diepte);
        if (e.stoelen) lokaal.y0 -= rand;
        return this.naarZaal(lokaal, [{ x: p.x, y: p.y, hoek: p.hoek }].concat(stand));
      });
    }
    if (e.type === "object") {
      const m = Model.meubel(e.meubelId);
      return [this.naarZaal(this.rondom(m.breedte, m.diepte), stand)];
    }
    return [];
  },

  /* De rechthoek van een vast object. Bij een deur hoort de draaicirkel erbij,
     bij een uitgifteluik de toonbank. */
  vanVastObject(o) {
    const stand = [{ x: o.x, y: o.y, hoek: o.hoek }];
    let lokaal;
    if (o.soort === "deur") {
      const w = o.breedte;
      lokaal = o.kant > 0 ? { x0: 0, y0: -11, x1: w, y1: w } : { x0: 0, y0: -w, x1: w, y1: 11 };
    } else if (o.soort === "uitgifte") {
      lokaal = { x0: -o.breedte / 2, y0: -10, x1: o.breedte / 2, y1: 9 + (o.diepte || 0) };
    } else {
      lokaal = this.rondom(o.breedte, o.diepte || 16);
    }
    return this.naarZaal(lokaal, stand);
  },

  /* Ligt een punt op de vloer? (Een lijn vanaf het punt naar rechts snijdt
     de omtrek een oneven aantal keer.) */
  opDeVloer(x, y, omtrek) {
    let binnen = false;
    for (let i = 0, j = omtrek.length - 1; i < omtrek.length; j = i++) {
      const [xi, yi] = omtrek[i], [xj, yj] = omtrek[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) binnen = !binnen;
    }
    return binnen;
  },

  /* ---------------- plaatsen ---------------- */

  /* Alle teksten die in deze tekening horen, met het object waar ze bij horen. */
  verzamelen(zaal, elementen) {
    const teksten = [];
    elementen.forEach(e => {
      let tekst = null, grootte = 26;
      if (e.type === "object") { tekst = Model.meubel(e.meubelId).naam; grootte = 27; }
      if (e.type === "tafel" && e.functie && e.functie !== "geen") {
        tekst = e.functie === "spreek" ? "Spreektafel"
              : e.functie === "koffie" ? "Koffie en thee"
              : "Eten en buffet";
      }
      if (tekst) {
        const delen = this.vanElement(e);
        const bij = delen.reduce((a, r) => ({ x0: Math.min(a.x0, r.x0), y0: Math.min(a.y0, r.y0),
          x1: Math.max(a.x1, r.x1), y1: Math.max(a.y1, r.y1) }));
        const m = Model.meubel(e.meubelId);
        teksten.push({ tekst, grootte, bij, vorm: { x: e.x, y: e.y, hoek: e.hoek, b: m.breedte, d: m.diepte } });
      }
    });
    // de vaste objecten als laatste: een kast herken je ook zonder naam ernaast,
    // dus het meubilair krijgt eerst de plekken het dichtst bij
    (zaal.vasteObjecten || []).forEach(o => {
      if (o.opschrift) teksten.push({ tekst: o.opschrift, grootte: 26, bij: this.vanVastObject(o),
        vorm: { x: o.x, y: o.y, hoek: o.hoek, b: o.breedte, d: o.diepte || 0 } });
    });
    return teksten;
  },

  /* De plekken om te proberen, op volgorde van voorkeur: per afstand eerst
     onder, boven, rechts en links, dan de vier schuine kanten. */
  kandidaten(bij, b, h) {
    const mx = (bij.x0 + bij.x1) / 2, my = (bij.y0 + bij.y1) / 2;
    const uit = [];
    this.afstanden.forEach((a, stap) => {
      const onder = bij.y1 + a + h / 2, boven = bij.y0 - a - h / 2;
      const rechts = bij.x1 + a + b / 2, links = bij.x0 - a - b / 2;
      [[mx, onder], [mx, boven], [rechts, my], [links, my],
       [rechts, onder], [links, onder], [rechts, boven], [links, boven]]
        .forEach(([x, y]) => uit.push({ x, y, ver: stap > 0 }));
    });
    return uit;
  },

  /* Past een tekst van b bij h, onder hoek tekstHoek, midden op de
     (gedraaide) vorm zelf? */
  pastOp(vorm, b, h, tekstHoek) {
    const r = (tekstHoek - (vorm.hoek || 0)) * Math.PI / 180, c = Math.cos(r), z = Math.sin(r);
    return [[-b / 2, -h / 2], [b / 2, -h / 2], [b / 2, h / 2], [-b / 2, h / 2]].every(([x, y]) =>
      Math.abs(x * c - y * z) <= vorm.b / 2 - 4 && Math.abs(x * z + y * c) <= vorm.d / 2 - 4);
  },

  /* Zet alle teksten in de groep doel. elementen mag leeg zijn (scherm 6). */
  plaatsen(zaal, elementen, doel) {
    doel.innerHTML = "";
    const omtrek = Zaalvorm.omtrek(zaal.vorm);
    const hindernissen = (zaal.vasteObjecten || []).map(o => this.vanVastObject(o))
      .concat(...elementen.map(e => this.vanElement(e)));
    // de zaalnaam linksboven (zie Tekening.naam): vaag, maar een tekst erover leest slecht
    if (zaal.naam) {
      const k = Zaalvorm.kader(omtrek);
      hindernissen.push({ x0: k.x0 + 40, y0: k.y0 + 40, x1: k.x0 + 40 + zaal.naam.length * 64 * 0.62, y1: k.y0 + 104 });
    }
    const geplaatst = [];
    const m = this.muurmarge;

    this.verzamelen(zaal, elementen).forEach(t => {
      // een ruwe schatting van de tekstmaat, met wat lucht eromheen
      const b = t.tekst.length * t.grootte * 0.6 + 8, h = t.grootte + 6;
      const vak = p => ({ x0: p.x - b / 2, y0: p.y - h / 2, x1: p.x + b / 2, y1: p.y + h / 2 });

      const binnen = r => [[r.x0 - m, r.y0 - m], [r.x1 + m, r.y0 - m], [r.x1 + m, r.y1 + m], [r.x0 - m, r.y1 + m]]
        .every(([x, y]) => this.opDeVloer(x, y, omtrek));
      const bedekt = r => hindernissen.concat(geplaatst)
        .reduce((som, o) => som + this.overlapping(r, o), 0);

      const opties = this.kandidaten(t.bij, b, h).filter(p => binnen(vak(p)));
      /* De eerste plek waar niets staat. Is die er niet, dan op het object
         zelf als de tekst daar past (met een lichte achtergrond, zodat hij
         leesbaar blijft), en anders de plek die het minst bedekt. */
      let p = opties.find(p => bedekt(vak(p)) === 0);
      let draai = 0;
      if (!p) {
        // op het object: liefst recht, anders mee met het object (maar nooit ondersteboven)
        const mee = (((t.vorm.hoek || 0) % 180) + 180) % 180;
        draai = [0, mee > 90 ? mee - 180 : mee].find(hoek => this.pastOp(t.vorm, b, h, hoek));
        if (draai !== undefined) p = { x: t.vorm.x, y: t.vorm.y, ver: false, opObject: true };
        else draai = 0;
      }
      p = p || opties.sort((a, c) => bedekt(vak(a)) - bedekt(vak(c)))[0]
        || { x: (t.bij.x0 + t.bij.x1) / 2, y: t.bij.y1 + this.afstanden[0] + h / 2, ver: false };
      const r = vak(p);
      // een tekst op zijn eigen object neemt geen vrije ruimte in
      if (!p.opObject) geplaatst.push(r);

      const g = Vormen.el("g", { transform: `rotate(${draai} ${p.x} ${p.y})` }, doel);
      if (p.opObject) {
        Vormen.el("rect", { x: r.x0, y: r.y0, width: b, height: h, rx: 4,
          fill: "var(--floor)", "fill-opacity": 0.9 }, g);
      }

      if (p.ver) {
        // stippellijn van de rand van het object naar de rand van de tekst
        const van = { x: Math.max(t.bij.x0, Math.min(p.x, t.bij.x1)), y: Math.max(t.bij.y0, Math.min(p.y, t.bij.y1)) };
        const naar = { x: Math.max(r.x0, Math.min(van.x, r.x1)), y: Math.max(r.y0, Math.min(van.y, r.y1)) };
        Vormen.el("line", { x1: van.x, y1: van.y, x2: naar.x, y2: naar.y,
          stroke: "var(--ink-faint)", "stroke-width": 2, "stroke-dasharray": "5 5" }, doel);
      }
      const tekst = Vormen.el("text", { x: p.x, y: p.y + t.grootte * 0.35, "text-anchor": "middle",
        "font-size": t.grootte, fill: "var(--ink-soft)" }, g);
      tekst.textContent = t.tekst;
    });
  }
};
