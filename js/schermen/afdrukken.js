/* schermen/afdrukken.js — scherm 4: het blad afdrukken.

   Toont één opstelling als afdrukbaar blad: dezelfde tekening als het
   tekenscherm (via tekening.js, zonder raster en zonder markering), plus de
   gegevens van de opstelling en de benodigdheden uit telling.js. Een knop
   roept de afdrukfunctie van de browser aan; hoe het blad er dan uitziet
   staat in css/blad.css. */

const SchermAfdrukken = {

  opstelling: null,
  zaal: null,

  open(opstelling) {
    this.opstelling = opstelling;
    this.zaal = Model.zaal(opstelling.zaalId);
    this.teken();
    this.bedieningAanzetten();
  },

  teken() {
    const { opstelling, zaal } = this;
    const gebouw = Model.gebouw(zaal.gebouwId);
    const vereniging = opstelling.verenigingId && Model.vereniging(opstelling.verenigingId);
    const regels = Telling.regels(opstelling, zaal);
    const tekorten = regels.filter(r => r.tekort > 0);

    // ruim kader om de zaal, want er is op het blad geen raster meer dat anders
    // als enige de rand van de tekening zou bepalen
    const k = Tekening.kader(zaal);
    const M = 100;
    const viewBox = `${k.x0 - M} ${k.y0 - M} ${k.x1 - k.x0 + 2 * M} ${k.y1 - k.y0 + 2 * M}`;

    document.getElementById("afdrukscherm").innerHTML = `
      <div class="afdrukbalk no-print">
        <button class="ghost" id="afdrukUitvoeren">Dit blad afdrukken</button>
      </div>
      <div class="bladvoorbeeld">
        <div class="blad">
          <div class="bladkop">
            <h1>${zaal.naam}</h1>
            <p>${gebouw.naam}</p>
          </div>
          <div class="bladmeta">
            <div><span>Vereniging</span><b>${vereniging ? vereniging.naam : "Geen vereniging"}</b></div>
            <div><span>Moment</span><b>${SchermStart.momentTekst(opstelling.gebruiksmoment)}</b></div>
            <div><span>Aantal personen</span><b>${Telling.aantalPersonen(opstelling)}</b></div>
            <div><span>Verantwoordelijke</span><b>${Model.verantwoordelijkheden[opstelling.verantwoordelijke] || "—"}</b></div>
          </div>

          <svg class="bladplan" viewBox="${viewBox}">
            <g id="bladRuimte"></g>
            <g id="bladVast"></g>
            <g id="bladElementen"></g>
            <g id="bladNaam"></g>
            <g id="bladSchaal"></g>
          </svg>

          <div class="bladvoet">
            <div class="bladbenodigd">
              <h2>Benodigd</h2>
              ${regels.map(r => `<div class="bline${r.tekort ? " over" : ""}">
                <span>${r.naam}</span><b>${r.aantal}</b></div>`).join("")}
              ${tekorten.length ? `<p class="bladwaarschuwing">${tekorten.map(r =>
                `${r.tekort} ${r.naam.toLowerCase()} meer dan er in deze zaal staan.`).join("<br>")}</p>` : ""}
            </div>
            ${opstelling.opmerkingen ? `<div class="bladopmerkingen">
              <h2>Opmerkingen</h2><p>${opstelling.opmerkingen}</p></div>` : ""}
          </div>
        </div>
      </div>`;

    // het raster wordt op het blad niet getekend: een losstaand groepje dat
    // Tekening.zaal wel mag vullen, maar dat nergens in het blad hangt
    const raster = document.createElementNS("http://www.w3.org/2000/svg", "g");
    Tekening.zaal(zaal, {
      raster,
      ruimte: document.getElementById("bladRuimte"),
      vast: document.getElementById("bladVast"),
      schaalstok: document.getElementById("bladSchaal"),
      naam: document.getElementById("bladNaam")
    });
    Tekening.elementen(opstelling, document.getElementById("bladElementen"), null);
  },

  bedieningAanzetten() {
    this._onKlik = ev => { if (ev.target.closest("#afdrukUitvoeren")) window.print(); };
    document.getElementById("afdrukscherm").addEventListener("click", this._onKlik);
  },

  /* Aangeroepen door app.js vlak voordat een ander scherm opent. */
  sluiten() {
    document.getElementById("afdrukscherm").removeEventListener("click", this._onKlik);
  }
};
