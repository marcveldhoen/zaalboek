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
    this.hoogtesVastzetten();
  },

  /* Bij liggend (een zijbalk naast de tekening, css/blad.css) regelt een
     CSS-grid de hoogte van .bladplan, en dat is al bevestigd goed op papier.
     Bij staand (de gewone volgorde, gewoon onder elkaar) bleken zowel
     flexbox als CSS-grid dat niet betrouwbaar te doen in de échte afdruk van
     Chrome. Een eerste poging om dit met de hand uit te rekenen (.bladplan
     tijdelijk op 0, dan de resterende ruimte boven .bladvoet opmeten) loste
     de overloop naar een tweede pagina wel op, maar duwde .bladvoet zelf van
     de pagina af: die meting bleek vlak voor het afdrukken (het
     beforeprint-moment) nog deels de afmetingen van het schermvoorbeeld te
     gebruiken (297mm) in plaats van de kleinere papiermaat (264mm) — alsof
     niet alle eigenschappen van @media print op dat moment al bijgewerkt
     waren. Daarom hier geen enkele eigenschap van .blad zelf meer live
     aflezen: de beschikbare hoogte staat vast (zie css/blad.css, hetzelfde
     getal als daar), alleen de positie van .bladvoet wordt nog gemeten.
     Wordt zowel na het tekenen aangeroepen (voor het schermvoorbeeld) als
     vlak voor het echte afdrukken (zie bedieningAanzetten hieronder). */
  hoogtesVastzetten() {
    const MM_PX = 96 / 25.4;                                // vaste omrekening, los van schermresolutie
    const printend = window.matchMedia("print").matches;
    // gelijk aan css/blad.css: op het scherm het volle vel (297mm) met 15mm
    // opvulling rondom (dus 267mm inhoud, 15mm vanaf de bovenkant), op
    // papier de al verkleinde maat uit @media print (264mm, zonder opvulling)
    const inhoudBovenMm = printend ? 0 : 15;
    const inhoudHoogteMm = printend ? 264 : 267;

    document.querySelectorAll("#afdrukscherm .blad:not(.bladtussen)").forEach(blad => {
      const plan = blad.querySelector(".bladplan");
      if (this.liggend) { plan.style.height = ""; return; }   // liggend regelt dit zelf, via de zijbalk-grid

      const voet = blad.querySelector(".bladvoet");
      plan.style.height = "0px";
      const inhoudOnder = blad.getBoundingClientRect().top + (inhoudBovenMm + inhoudHoogteMm) * MM_PX;
      const voetOnder = voet.getBoundingClientRect().bottom;
      plan.style.height = Math.max(0, inhoudOnder - voetOnder) + "px";
    });
  },

  /* Staand of liggend wordt in de app gekozen (het vinkje hierboven), niet
     overgelaten aan het afdrukvenster van de browser — dat bleek bij het
     beproeven op papier niet betrouwbaar door te geven welke richting
     gekozen was, waardoor het blad in geen van beide gevallen op één pagina
     paste. `@page` kan niet rechtstreeks aan een class gekoppeld worden,
     dus wordt de papiermaat hier als eigen stijlregel ingevoegd; de hoogte
     van `.blad` zelf regelt css/blad.css via de class "liggend". */
  papierRichtingToepassen() {
    document.getElementById("afdrukscherm").classList.toggle("liggend", this.liggend);

    let stijl = document.getElementById("afdrukPapier");
    if (!stijl) {
      stijl = document.createElement("style");
      stijl.id = "afdrukPapier";
      document.head.appendChild(stijl);
    }
    stijl.textContent = `@page{size:A4 ${this.liggend ? "landscape" : "portrait"}}`;
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

    return `<div class="blad">
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
        <g class="bladRuimte"></g>
        <g class="bladVast"></g>
        <g class="bladElementen"></g>
        <g class="bladNaam"></g>
        <g class="bladSchaal"></g>
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
    </div>`;
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
      this.papierRichtingToepassen();
      this.hoogtesVastzetten();
    };
    document.getElementById("afdrukscherm").addEventListener("change", this._onChange);

    /* vlak voor het echte afdrukken gelden de @media print-regels al (ander
       papierformaat, geen opmaak meer rond het blad), dus moet de hoogte van
       de tekening opnieuw uitgerekend worden — en na afloop weer terug voor
       het schermvoorbeeld. */
    this._onBeforePrint = () => this.hoogtesVastzetten();
    this._onAfterPrint = () => this.hoogtesVastzetten();
    window.addEventListener("beforeprint", this._onBeforePrint);
    window.addEventListener("afterprint", this._onAfterPrint);
  },

  /* Aangeroepen door app.js vlak voordat een ander scherm opent. */
  sluiten() {
    document.getElementById("afdrukscherm").removeEventListener("click", this._onKlik);
    document.getElementById("afdrukscherm").removeEventListener("change", this._onChange);
    window.removeEventListener("beforeprint", this._onBeforePrint);
    window.removeEventListener("afterprint", this._onAfterPrint);
    document.getElementById("afdrukPapier")?.remove();
  }
};
