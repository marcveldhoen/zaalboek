/* telling.js — hoeveel meubilair een opstelling gebruikt, afgezet tegen wat er
   normaal in de zaal staat.

   Dit bestand rekent alleen. Hoe de uitkomst getoond wordt, staat in het scherm;
   later gebruikt het geprinte blad dezelfde uitkomst voor de benodigdheden. */

const Telling = {

  /* Aantallen per meubel-id. Stoelen komen uit vier bronnen bij elkaar:
     los, in een rij, in een kring, en aan de zijden van een tafel. */
  aantallen(opstelling) {
    const per = {};
    const tel = (id, hoeveel) => { per[id] = (per[id] || 0) + hoeveel; };

    opstelling.elementen.forEach(e => {
      if (e.type === "tafel") {
        tel(e.meubelId, 1);
        const s = e.stoelen;
        tel("stoel", s.boven + s.onder + s.links + s.rechts);
      }
      else if (e.type === "stoel")  tel("stoel", 1);
      else if (e.type === "rij")    tel("stoel", e.n);
      else if (e.type === "kring")  tel("stoel", e.n);
      else if (e.type === "object") tel(e.meubelId, 1);
    });

    return per;
  },

  /* Het aantal personen dat in de opstelling past: het aantal stoelen. */
  aantalPersonen(opstelling) {
    return this.aantallen(opstelling).stoel || 0;
  },

  /* De regels zoals ze in het paneel en straks op het blad komen te staan.
     Stoelen en tafelsoorten staan er altijd; objecten alleen als ze gebruikt
     worden, anders wordt de lijst een opsomming van alles wat er niet staat. */
  regels(opstelling, zaal) {
    const gebruikt = this.aantallen(opstelling);
    const voorraad = zaal.voorraad || {};
    const regels = [];

    const regel = (meubel) => {
      const aantal = gebruikt[meubel.id] || 0;
      const erIsVoorraad = voorraad[meubel.id] || 0;
      regels.push({
        naam: meubel.meervoud || meubel.naam,
        aantal,
        voorraad: erIsVoorraad,
        tekort: Math.max(0, aantal - erIsVoorraad)
      });
    };

    Model.meubeltypen("stoel").forEach(regel);
    Model.meubeltypen("tafel")
      .filter(m => (voorraad[m.id] || 0) > 0 || (gebruikt[m.id] || 0) > 0)
      .forEach(regel);
    Model.meubeltypen("object")
      .filter(m => (gebruikt[m.id] || 0) > 0)
      .forEach(regel);

    return regels;
  }
};
