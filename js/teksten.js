/* teksten.js — de namen van objecten en tafelfuncties, in de kantlijn.

   Een naam op of naast het meubilair maakt de tekening rommelig en kan het
   object zelf onherkenbaar maken. Daarom staan de namen buiten de muren, op
   een rij langs de zijde die het dichtst bij het object ligt, met een dun
   lijntje en een stipje bij het object. Zo blijft de zaal zelf leeg van tekst.

   Opschriften van vaste objecten (bijvoorbeeld "Keuken") horen hier niet bij:
   die staan op een vaste plek op het object zelf, zie Tekening.vasteObjecten.

   Alles wordt uitgerekend in zaalcentimeters, niet gemeten in de browser. Zo
   staat een naam op het scherm en op het printblad op precies dezelfde plek,
   en kan het blad vooraf weten hoeveel ruimte de kantlijn nodig heeft. */

const Teksten = {

  grootte: 26,        // lettergrootte, in centimeters op de tekening
  buitenMuur: 40,     // afstand tussen de muur en de tekst
  tussenruimte: 10,   // minimale ruimte tussen twee teksten aan dezelfde zijde

  /* ---------------- waar een element staat ---------------- */

  /* Een rechthoek { x0, y0, x1, y1 } in het eigen assenstelsel van een vorm,
     naar de zaal: de rechte rechthoek die precies om de gedraaide vorm past.
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

  /* De rechthoeken die een element inneemt, in de zaal. Een tafel telt mee
     met de stoelen eromheen, zodat het stipje aan de buitenkant staat. */
  vanElement(e) {
    const stand = [{ x: e.x, y: e.y, hoek: e.hoek }];
    const stoel = Vormen.stoelmaat();
    const rand = Vormen.maat.stoelruimte + stoel.diepte;

    if (e.type === "tafel" || e.type === "object") {
      const m = Model.meubel(e.meubelId);
      const lokaal = this.rondom(m.breedte, m.diepte);
      if (e.type === "tafel") {
        const s = e.stoelen;
        if (s.boven)  lokaal.y0 -= rand;
        if (s.onder)  lokaal.y1 += rand;
        if (s.links)  lokaal.x0 -= rand;
        if (s.rechts) lokaal.x1 += rand;
      }
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

  overlapt(a, b) {
    return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  },

  /* De naam die bij een element hoort, of null. */
  naam(e) {
    if (e.type === "object") return Model.meubel(e.meubelId).naam;
    if (e.type === "tafel" && e.functie && e.functie !== "geen") {
      return e.functie === "spreek" ? "Spreektafel"
           : e.functie === "koffie" ? "Koffie en thee"
           : "Eten en buffet";
    }
    return null;
  },

  /* ---------------- de indeling van de kantlijn ---------------- */

  /* Waar elke naam komt te staan. Geeft { teksten, kader }: per tekst het
     midden (x, y), de maat, de zijde en het punt bij het object (van);
     kader is de rechthoek om alle teksten samen, of null als er geen zijn. */
  indeling(zaal, elementen) {
    const k = Zaalvorm.kader(Zaalvorm.omtrek(zaal.vorm));
    const h = this.grootte, a = this.buitenMuur;
    const zijden = { links: [], rechts: [], boven: [], onder: [] };

    elementen.forEach(e => {
      const tekst = this.naam(e);
      if (!tekst) return;
      const r = this.vanElement(e)[0];
      const mx = (r.x0 + r.x1) / 2, my = (r.y0 + r.y1) / 2;
      const b = tekst.length * h * 0.6;

      // de zijde van de zaal die het dichtst bij het object ligt
      const afstand = { links: mx - k.x0, rechts: k.x1 - mx, boven: my - k.y0, onder: k.y1 - my };
      const zijde = Object.keys(afstand).reduce((p, q) => afstand[q] < afstand[p] ? q : p);

      const t = { tekst, b, h, zijde };
      if (zijde === "links")  Object.assign(t, { langs: my, x: k.x0 - a - b / 2, van: { x: r.x0, y: my } });
      if (zijde === "rechts") Object.assign(t, { langs: my, x: k.x1 + a + b / 2, van: { x: r.x1, y: my } });
      if (zijde === "boven")  Object.assign(t, { langs: mx, y: k.y0 - a - h / 2, van: { x: mx, y: r.y0 } });
      if (zijde === "onder")  Object.assign(t, { langs: mx, y: k.y1 + a + h / 2, van: { x: mx, y: r.y1 } });
      zijden[zijde].push(t);
    });

    // langs elke zijde: op volgorde, en uit elkaar waar ze elkaar zouden raken
    const teksten = [];
    Object.keys(zijden).forEach(zijde => {
      const rij = zijden[zijde].sort((p, q) => p.langs - q.langs);
      const staand = zijde === "links" || zijde === "rechts";
      const lengte = t => (staand ? t.h : t.b) + this.tussenruimte;
      const eind = staand ? k.y1 : k.x1;

      for (let i = 1; i < rij.length; i++) {
        const vorige = rij[i - 1], t = rij[i];
        t.langs = Math.max(t.langs, vorige.langs + (lengte(vorige) + lengte(t)) / 2);
      }
      // loopt de rij voorbij het einde van de muur, dan schuift hij terug
      for (let i = rij.length - 1; i >= 0; i--) {
        const grens = i === rij.length - 1 ? eind - lengte(rij[i]) / 2
                    : rij[i + 1].langs - (lengte(rij[i]) + lengte(rij[i + 1])) / 2;
        rij[i].langs = Math.min(rij[i].langs, grens);
      }

      rij.forEach(t => {
        if (staand) t.y = t.langs; else t.x = t.langs;
        teksten.push(t);
      });
    });

    // een zaalnaam die buiten de zaal moest, hoort ook binnen het kader
    const vakken = teksten.map(t => ({ x0: t.x - t.b / 2, y0: t.y - t.h / 2, x1: t.x + t.b / 2, y1: t.y + t.h / 2 }));
    const naam = zaal.naam && this.zaalnaamPlek(zaal, elementen);
    if (naam && naam.buiten) vakken.push(naam);

    const kader = vakken.length ? {
      x0: Math.min(...vakken.map(v => v.x0)), y0: Math.min(...vakken.map(v => v.y0)),
      x1: Math.max(...vakken.map(v => v.x1)), y1: Math.max(...vakken.map(v => v.y1))
    } : null;
    return { teksten, kader };
  },

  /* ---------------- de zaalnaam ---------------- */

  naamGrootte: 64,

  /* Waar de zaalnaam (het vage watermerk) komt te staan: de eerste plek
     waar hij vrij op de vloer ligt, rij voor rij vanaf linksboven — zo blijft
     hij waar het kan op zijn vertrouwde plek. Is er nergens ruimte, dan komt
     hij buiten de zaal, onder de schaalstok. Geeft de rechthoek { x0, y0,
     x1, y1 } en of hij buiten staat. */
  zaalnaamPlek(zaal, elementen) {
    const omtrek = Zaalvorm.omtrek(zaal.vorm);
    const k = Zaalvorm.kader(omtrek);
    const b = zaal.naam.length * this.naamGrootte * 0.62, h = this.naamGrootte;
    const marge = 20, stap = 20;

    const hindernissen = (zaal.vasteObjecten || []).map(o => this.vanVastObject(o))
      .concat(...elementen.map(e => this.vanElement(e)));

    for (let y = k.y0 + 30; y + h <= k.y1 - 30; y += stap) {
      for (let x = k.x0 + 30; x + b <= k.x1 - 30; x += stap) {
        const vak = { x0: x, y0: y, x1: x + b, y1: y + h };
        const ruim = { x0: x - marge, y0: y - marge, x1: x + b + marge, y1: y + h + marge };
        const opVloer = [[ruim.x0, ruim.y0], [ruim.x1, ruim.y0], [ruim.x1, ruim.y1], [ruim.x0, ruim.y1]]
          .every(([px, py]) => this.opDeVloer(px, py, omtrek));
        if (opVloer && !hindernissen.some(o => this.overlapt(ruim, o))) return Object.assign(vak, { buiten: false });
      }
    }
    // onder de schaalstok (die staat 120 cm onder de muur, zie Tekening.schaalstok)
    return { x0: k.x0, y0: k.y1 + 170, x1: k.x0 + b, y1: k.y1 + 170 + h, buiten: true };
  },

  /* ---------------- tekenen ---------------- */

  plaatsen(zaal, elementen, doel) {
    doel.innerHTML = "";
    this.indeling(zaal, elementen).teksten.forEach(t => {
      // het lijntje eindigt aan de kant van de tekst die naar de zaal wijst
      const naar = t.zijde === "links"  ? { x: t.x + t.b / 2 + 6, y: t.y }
                 : t.zijde === "rechts" ? { x: t.x - t.b / 2 - 6, y: t.y }
                 : t.zijde === "boven"  ? { x: t.x, y: t.y + t.h / 2 + 4 }
                 :                        { x: t.x, y: t.y - t.h / 2 - 4 };
      Vormen.el("line", { x1: t.van.x, y1: t.van.y, x2: naar.x, y2: naar.y,
        stroke: "var(--ink-faint)", "stroke-width": 2 }, doel);
      Vormen.el("circle", { cx: t.van.x, cy: t.van.y, r: 6, fill: "var(--ink-soft)" }, doel);

      const tekst = Vormen.el("text", { x: t.x, y: t.y + t.h * 0.35, "text-anchor": "middle",
        "font-size": t.h, fill: "var(--ink-soft)" }, doel);
      tekst.textContent = t.tekst;
    });
  }
};
