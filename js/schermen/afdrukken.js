/* schermen/afdrukken.js — scherm 4: het blad afdrukken.

   Drie keuzes, allemaal hetzelfde blad in een andere hoeveelheid (functioneel
   ontwerp, hoofdstuk 4): één opstelling, alle opstellingen van één zaal, of de
   hele map. De volgorde is steeds per gebouw en daarbinnen per zaal, met een
   tussenblad per zaal — behalve bij één opstelling, waar dat niets toevoegt.

   Elk blad is dezelfde tekening als het tekenscherm (via tekening.js, zonder
   raster en zonder markering), plus de gegevens van de opstelling en de
   benodigdheden uit telling.js. Eén knop roept de afdrukfunctie van de
   browser aan; hoe het blad en de paginaovergangen eruitzien staat in
   css/blad.css. */

/* Het waarschuwingsicoon naast een tekort: vorm én tekst, nooit alleen kleur. */
const WAARSCHUWING_ICOON = '<svg viewBox="0 0 16 16" aria-hidden="true">' +
  '<path d="M8 2.5l6 10.5H2z"/><path d="M8 7v3"/><path d="M8 11.8v.2"/></svg>';

const SchermAfdrukken = {

  scope: null,          // "opstelling" | "zaal" | "alles"
  opstelling: null,      // alleen gevuld bij scope "opstelling"
  zaal: null,             // alleen gevuld bij scope "zaal"
  liggend: false,         // staand of liggend A4 — een keuze in de app, niet in het afdrukvenster van de browser

  /* selectie: { scope: "opstelling", opstelling } of { scope: "zaal", zaal }
     of { scope: "alles" }. */
  open(selectie) {
    this.scope = selectie.scope;
    this.opstelling = selectie.opstelling || null;
    this.zaal = selectie.zaal || null;
    this.liggend = false;
    this.teken();
    this.bedieningAanzetten();
  },

  /* ---------------- welke zalen en opstellingen ---------------- */

  groepen() {
    if (this.scope === "opstelling") {
      return [{ zaal: Model.zaal(this.opstelling.zaalId), opstellingen: [this.opstelling] }];
    }
    if (this.scope === "zaal") {
      const opstellingen = Model.document.opstellingen.filter(o => o.zaalId === this.zaal.id);
      return opstellingen.length ? [{ zaal: this.zaal, opstellingen }] : [];
    }
    // scope "alles": per gebouw, daarbinnen per zaal — dezelfde volgorde als
    // het startscherm. Een zaal zonder opstellingen levert geen leeg blad op.
    return Model.document.gebouwen.slice().sort((a, b) => a.volgorde - b.volgorde)
      .flatMap(gebouw => Model.document.zalen
        .filter(z => z.gebouwId === gebouw.id)
        .sort((a, b) => a.volgorde - b.volgorde)
        .map(zaal => ({ zaal, opstellingen: Model.document.opstellingen.filter(o => o.zaalId === zaal.id) })))
      .filter(groep => groep.opstellingen.length);
  },

  /* ---------------- tekenen ---------------- */

  teken() {
    const groepen = this.groepen();
    const metTussenblad = this.scope !== "opstelling";
    const bladen = [];   // { zaal, opstelling } in dezelfde volgorde als de .bladplan-svg's hieronder

    const inhoud = groepen.length
      ? groepen.map(groep => this.groepHtml(groep, metTussenblad, bladen)).join("")
      : `<p class="empty bladleeg">Nog geen opstellingen om af te drukken.</p>`;

    const knopLabel = this.scope === "opstelling" ? "Dit blad afdrukken"
      : this.scope === "zaal" ? "Deze zaal afdrukken"
      : "De hele map afdrukken";

    document.getElementById("afdrukscherm").innerHTML = `
      <div class="afdrukbalk no-print">
        <label class="afdrukliggend">
          <input type="checkbox" id="afdrukLiggend" ${this.liggend ? "checked" : ""}>
          Liggend afdrukken
        </label>
        <button class="ghost" id="afdrukUitvoeren" ${bladen.length ? "" : "disabled"}>${knopLabel}</button>
      </div>
      <div class="bladvoorbeeld">${inhoud}</div>`;

    const svgs = document.querySelectorAll("#afdrukscherm .bladplan");
    bladen.forEach((blad, i) => this.tekenBlad(blad, svgs[i]));

    this.papierRichtingToepassen();
  },

  /* Staand of liggend wordt in de app gekozen (het vinkje hierboven), niet
     overgelaten aan het afdrukvenster van de browser — dat bleek bij het
     beproeven op papier niet betrouwbaar door te geven welke richting
     gekozen was, waardoor het blad in geen van beide gevallen op één pagina
     paste. `@page` kan niet rechtstreeks aan een class gekoppeld worden,
     dus wordt de papiermaat bij liggend hier als eigen stijlregel ingevoegd
     (een tweede `@page`-regel, naast die van css/blad.css); staand is het
     gewone geval en heeft aan de `@page` uit css/blad.css zelf genoeg, dus
     blijft die stijlregel dan leeg — minder kans dat twee `@page`-regels
     tegelijk door elkaar gaan lopen. De hoogte van `.blad` zelf regelt
     css/blad.css via de class "liggend". */
  papierRichtingToepassen() {
    document.getElementById("afdrukscherm").classList.toggle("liggend", this.liggend);

    let stijl = document.getElementById("afdrukPapier");
    if (!stijl) {
      stijl = document.createElement("style");
      stijl.id = "afdrukPapier";
      document.head.appendChild(stijl);
    }
    stijl.textContent = this.liggend ? "@page{size:A4 landscape}" : "";
  },

  groepHtml(groep, metTussenblad, bladen) {
    const gebouw = Model.gebouw(groep.zaal.gebouwId);
    const tussenblad = metTussenblad ? `
      <div class="blad bladtussen">
        <h1>${groep.zaal.naam}</h1>
        <p>${gebouw.naam}</p>
      </div>` : "";

    const bladenHtml = groep.opstellingen.map(opstelling => {
      bladen.push({ zaal: groep.zaal, opstelling });
      return this.bladHtml(groep.zaal, gebouw, opstelling);
    }).join("");

    return tussenblad + bladenHtml;
  },

  bladHtml(zaal, gebouw, opstelling) {
    const vereniging = opstelling.verenigingId && Model.vereniging(opstelling.verenigingId);
    const regels = Telling.regels(opstelling, zaal);
    const tekorten = regels.filter(r => r.tekort > 0);

    // ruim kader om de zaal, want er is op het blad geen raster meer dat anders
    // als enige de rand van de tekening zou bepalen
    const k = Tekening.kader(zaal);
    const M = 100;
    const viewBox = `${k.x0 - M} ${k.y0 - M} ${k.x1 - k.x0 + 2 * M} ${k.y1 - k.y0 + 2 * M}`;

    /* Staand staat de kop over de hele breedte boven de tekening; liggend
       bovenin de kolom naast de tekening, anders neemt hij op het lage vel
       zoveel hoogte in dat de tekening er niet groter door wordt. */
    const kop = `<div class="bladkop">
        <div>
          <p class="bladplaats">${gebouw.naam} · ${zaal.naam}</p>
          <h1>${vereniging ? vereniging.naam : "Geen vereniging"}</h1>
          <p class="bladmoment">${this.momentRegel(opstelling.gebruiksmoment)}</p>
        </div>
        <img class="bladzegel" src="img/kerkzegel.png"
             alt="Zegel van de ${Model.gemeente}">
      </div>`;

    return `<div class="blad">
      ${this.liggend ? "" : kop}

      <div class="bladmidden">
        <!-- linksboven uitgelijnd: een brede zaal komt direct onder de kop -->
        <svg class="bladplan" viewBox="${viewBox}" preserveAspectRatio="xMinYMin meet">
          <g class="bladRuimte"></g>
          <g class="bladVast"></g>
          <g class="bladElementen"></g>
          <g class="bladNaam"></g>
          <g class="bladSchaal"></g>
        </svg>

        <div class="bladkolom">
          ${this.liggend ? kop : ""}
          <div class="bladvak">
            <h2>Aantal personen</h2>
            <div class="bladpersonen">${Telling.aantalPersonen(opstelling)}</div>
          </div>
          <div class="bladvak">
            <h2>Klaarzetten</h2>
            ${regels.map(r => `<div class="bline${r.tekort ? " over" : ""}">
              <span>${r.tekort ? WAARSCHUWING_ICOON : ""}${r.naam}</span><b>${r.aantal}</b></div>`).join("")}
            ${tekorten.length ? `<p class="bladwaarschuwing">${WAARSCHUWING_ICOON}
              <span>Meer dan er in deze zaal staan: ${tekorten.map(r =>
                `${r.tekort} ${r.naam.toLowerCase()}`).join(", ")}.</span></p>` : ""}
          </div>
          <div class="bladvak">
            <h2>Verantwoordelijk</h2>
            <p>${Model.verantwoordelijkheden[opstelling.verantwoordelijke] || "—"}</p>
          </div>
          ${opstelling.opmerkingen ? `<div class="bladvak">
            <h2>Opmerkingen</h2><p>${opstelling.opmerkingen}</p></div>` : ""}
        </div>
      </div>

      <div class="bladvoet">
        <span>Zaalboek · ${Model.gemeente}</span>
        <span>${opstelling.gewijzigdOp ? "Laatst gewijzigd " + this.datumTekst(opstelling.gewijzigdOp) : ""}</span>
      </div>
    </div>`;
  },

  /* "Dinsdag · avond · 20:00–22:00", zoals in de kop van het blad. */
  momentRegel(m) {
    if (!m) return "Geen vast moment";
    return [SchermStart.hoofdletter(m.dag), m.dagdeel, `${m.begin}–${m.eind}`]
      .filter(Boolean).join(" · ");
  },

  /* "2026-09-03" wordt "3 september 2026". */
  datumTekst(iso) {
    const maanden = ["januari", "februari", "maart", "april", "mei", "juni", "juli",
                     "augustus", "september", "oktober", "november", "december"];
    const [jaar, maand, dag] = iso.split("-").map(Number);
    return `${dag} ${maanden[maand - 1]} ${jaar}`;
  },

  /* Het raster wordt op het blad niet getekend: een losstaand groepje dat
     Tekening.zaal wel mag vullen, maar dat nergens in het blad hangt. */
  tekenBlad(blad, svg) {
    const raster = document.createElementNS("http://www.w3.org/2000/svg", "g");
    Tekening.zaal(blad.zaal, {
      raster,
      ruimte: svg.querySelector(".bladRuimte"),
      vast: svg.querySelector(".bladVast"),
      schaalstok: svg.querySelector(".bladSchaal"),
      naam: svg.querySelector(".bladNaam")
    });
    Tekening.elementen(blad.opstelling, svg.querySelector(".bladElementen"), null);
  },

  bedieningAanzetten() {
    this._onKlik = ev => { if (ev.target.closest("#afdrukUitvoeren")) window.print(); };
    document.getElementById("afdrukscherm").addEventListener("click", this._onKlik);

    this._onChange = ev => {
      if (ev.target.id !== "afdrukLiggend") return;
      this.liggend = ev.target.checked;
      this.teken();   // opnieuw opbouwen: liggend staat de kop op een andere plek
    };
    document.getElementById("afdrukscherm").addEventListener("change", this._onChange);
  },

  /* Aangeroepen door app.js vlak voordat een ander scherm opent. */
  sluiten() {
    document.getElementById("afdrukscherm").removeEventListener("click", this._onKlik);
    document.getElementById("afdrukscherm").removeEventListener("change", this._onChange);
    document.getElementById("afdrukPapier")?.remove();
  }
};
