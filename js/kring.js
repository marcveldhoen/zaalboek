/* kring.js — waar de stoelen in een kring komen te staan.

   Rond of ovaal, eventueel met een opening aan de voorzijde zodat er ook een
   hoefijzer te maken is. De opening wordt uitgedrukt in stoelplaatsen en niet in
   graden: dat is voor de koster te overzien.

   Bij een ovaal staan de stoelen niet op gelijke hoeken maar op gelijke afstand
   langs de omtrek. Daarom wordt de omtrek eerst in kleine stukjes opgemeten. */

const Kring = {

  /* Meet de omtrek op in 720 stapjes en houdt bij hoeveel centimeter er
     onderweg is afgelegd. */
  omtrekOpmeten(rx, ry) {
    const stappen = 720;
    const punten = [];
    const afgelegd = [0];
    let lengte = 0;

    for (let i = 0; i <= stappen; i++) {
      const t = 2 * Math.PI * i / stappen;
      const p = { x: rx * Math.sin(t), y: -ry * Math.cos(t) };
      punten.push(p);
      if (i > 0) {
        lengte += Math.hypot(p.x - punten[i - 1].x, p.y - punten[i - 1].y);
        afgelegd.push(lengte);
      }
    }
    return { punten, afgelegd, lengte };
  },

  /* De plek en de richting van elke stoel, ten opzichte van het midden. */
  posities(kring) {
    const rx = kring.rx;
    const ry = (kring.vorm === "ovaal" ? kring.ry : kring.rx);
    const { punten, afgelegd, lengte } = this.omtrekOpmeten(rx, ry);

    // de opening telt mee als waren het stoelplaatsen
    const plaatsen = kring.n + kring.opening;
    const uit = [];

    for (let i = 0; i < kring.n; i++) {
      const deel = (kring.opening / 2 + 0.5 + i) / plaatsen;
      const doel = deel * lengte;

      let k = 0;
      while (k < afgelegd.length - 1 && afgelegd[k + 1] < doel) k++;

      const p = punten[k];
      const hoek = Math.atan2(p.x, -p.y) * 180 / Math.PI;   // de stoel kijkt naar het midden
      uit.push({ x: p.x, y: p.y, hoek });
    }
    return uit;
  },

  /* Zet de kring op de maat die bij het aantal stoelen hoort, zodat ze precies
     naast elkaar passen. Afgerond op vijf centimeter. */
  passendMaken(kring) {
    const rx = kring.rx;
    const ry = (kring.vorm === "ovaal" ? kring.ry : kring.rx);
    const { lengte } = this.omtrekOpmeten(rx, ry);

    const nodig = (kring.n + kring.opening) * Vormen.maat.rijafstand;
    const factor = nodig / lengte;

    kring.rx = Math.max(70, Math.round(kring.rx * factor / 5) * 5);
    kring.ry = Math.max(70, Math.round(kring.ry * factor / 5) * 5);
  }
};
