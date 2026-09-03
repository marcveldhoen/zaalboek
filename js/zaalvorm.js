/* zaalvorm.js — van de ingevulde maten van een zaal naar haar omtrek.

   Een zaal bewaart maten, geen hoekpunten. Dit bestand rekent ze om op het
   moment dat er getekend wordt, zodat er maar één waarheid is.

   De oorsprong (0,0) ligt altijd linksboven. x loopt naar rechts, y naar onder. */

const Zaalvorm = {

  /* Geeft een lijst hoekpunten: [[x,y], [x,y], ...] */
  omtrek(vorm) {
    if (vorm.type === "rechthoek") {
      const b = vorm.breedte, d = vorm.diepte;
      return [[0, 0], [b, 0], [b, d], [0, d]];
    }

    if (vorm.type === "l-vorm") {
      const b = vorm.breedte, d = vorm.diepte;
      const hb = vorm.hapBreedte, hd = vorm.hapDiepte;   // de hap uit de hoek

      if (vorm.hoek === "rechtsonder")
        return [[0, 0], [b, 0], [b, d - hd], [b - hb, d - hd], [b - hb, d], [0, d]];
      if (vorm.hoek === "linksonder")
        return [[0, 0], [b, 0], [b, d], [hb, d], [hb, d - hd], [0, d - hd]];
      if (vorm.hoek === "rechtsboven")
        return [[0, 0], [b - hb, 0], [b - hb, hd], [b, hd], [b, d], [0, d]];
      if (vorm.hoek === "linksboven")
        return [[hb, 0], [b, 0], [b, d], [0, d], [0, hd], [hb, hd]];

      throw new Error("Onbekende hoek voor een L-vormige zaal: " + vorm.hoek);
    }

    /* De uitzondering: een zaal die geen rechthoek of L is, met de hoekpunten
       rechtstreeks in het document. */
    if (vorm.type === "punten") return vorm.punten;

    throw new Error("Onbekende zaalvorm: " + vorm.type);
  },

  /* Het kleinste rechthoekige kader om de omtrek heen. */
  kader(punten) {
    const xs = punten.map(p => p[0]);
    const ys = punten.map(p => p[1]);
    return {
      x0: Math.min(...xs), y0: Math.min(...ys),
      x1: Math.max(...xs), y1: Math.max(...ys)
    };
  }
};
