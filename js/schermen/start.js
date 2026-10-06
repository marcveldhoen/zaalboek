/* schermen/start.js — scherm 1: het startscherm.

   Gebouwen, daarbinnen de zalen, en per zaal de opstellingen. Dezelfde
   volgorde als de map (op `volgorde`), zodat scherm en papier straks
   hetzelfde beeld geven. Een opstelling aanklikken gaat naar het tekenscherm;
   "+ Nieuwe opstelling" maakt er een aan, met meteen een vereniging erbij.

   Dit scherm gebruikt niet de svg-plattegrond, maar een eigen lijst in
   #startscherm — zie app.js (toonLayout) voor het in- en uitschakelen van de
   andere schermdelen. */

const SchermStart = {

  zoekterm: "",
  nieuwIn: null,    // de zaal-id waarvoor het "nieuwe opstelling"-formulier openstaat
  bewerkIn: null,   // de opstelling-id waarvoor het "vereniging wijzigen"-formulier openstaat

  open() {
    this.zoekterm = "";
    this.nieuwIn = null;
    this.bewerkIn = null;

    document.getElementById("startscherm").innerHTML = `
      <div class="startkop">
        <h1>Overzicht</h1>
        <input type="search" id="startZoek" placeholder="Zoek op vereniging…">
      </div>
      <div class="startlijst" id="startlijst"></div>`;

    this.tekenLijst();
    this.bedieningAanzetten();
  },

  /* Wordt door app.js ingevuld en aangeroepen na het aanmaken van een
     opstelling of vereniging. */
  opWijziging: null,

  /* ---------------- de lijst ---------------- */

  tekenLijst() {
    const zoekterm = this.zoekterm.trim().toLowerCase();
    const html = Model.document.gebouwen.slice()
      .sort((a, b) => a.volgorde - b.volgorde)
      .map(gebouw => this.gebouwBlok(gebouw, zoekterm))
      .filter(Boolean).join("");

    document.getElementById("startlijst").innerHTML = html || (zoekterm
      ? `<p class="empty">Geen opstellingen gevonden voor deze zoekterm.</p>`
      : `<p class="empty">Nog geen zalen. Ga naar "Zalen inrichten" om te beginnen.</p>`);
  },

  gebouwBlok(gebouw, zoekterm) {
    const zalen = Model.document.zalen
      .filter(z => z.gebouwId === gebouw.id)
      .sort((a, b) => a.volgorde - b.volgorde)
      .map(zaal => this.zaalBlok(zaal, zoekterm))
      .filter(Boolean).join("");
    if (!zalen) return "";   // de zoekterm levert niets op in dit gebouw

    return `<div class="startgebouw"><h2>${gebouw.naam}</h2>${zalen}</div>`;
  },

  zaalBlok(zaal, zoekterm) {
    let opstellingen = Model.document.opstellingen.filter(o => o.zaalId === zaal.id);

    if (zoekterm) {
      opstellingen = opstellingen.filter(o => {
        const vereniging = o.verenigingId && Model.vereniging(o.verenigingId);
        return vereniging && vereniging.naam.toLowerCase().includes(zoekterm);
      });
      if (!opstellingen.length) return "";   // niets te vinden voor deze zaal
    }

    const regels = opstellingen.map(o => this.opstellingRegel(o)).join("");
    const nieuwFormulier = this.nieuwIn === zaal.id ? this.nieuweOpstellingFormulier() : "";

    return `<div class="startzaal">
      <div class="startzaalkop">
        <span class="startzaalnaam">${zaal.naam}</span>
        <button class="ghost" data-nieuwopstelling="${zaal.id}">+ Nieuwe opstelling</button>
      </div>
      ${regels || '<p class="empty">Nog geen opstellingen</p>'}
      ${nieuwFormulier}
    </div>`;
  },

  opstellingRegel(o) {
    if (this.bewerkIn === o.id) return this.opstellingBewerkFormulier(o);

    const vereniging = o.verenigingId && Model.vereniging(o.verenigingId);
    return `<div class="startregel">
      <button class="startregelnaam" data-opstelling="${o.id}">
        <span class="startvereniging">${vereniging ? vereniging.naam : "Naamloze opstelling"}</span>
        <span class="startmoment">${this.momentTekst(o.gebruiksmoment)}</span>
        <span class="startaantal">${o.aantalPersonen || 0} personen</span>
        ${o.teControleren ? '<span class="startvlag">te controleren</span>' : ""}
      </button>
      <button class="ghost klein" data-bewerk="${o.id}">Vereniging wijzigen</button>
      <button class="ghost klein" data-verwijder="${o.id}">Verwijderen</button>
    </div>`;
  },

  momentTekst(m) {
    if (!m) return "Geen vast moment";
    return `${this.hoofdletter(m.dag)}${m.dagdeel ? " " + m.dagdeel : ""}, ${m.begin}–${m.eind}`;
  },

  hoofdletter(tekst) {
    return tekst ? tekst[0].toUpperCase() + tekst.slice(1) : "";
  },

  /* ---------------- een nieuwe opstelling aanmaken ---------------- */

  nieuweOpstellingFormulier() {
    const opties = Model.document.verenigingen.map(v =>
      `<option value="${v.id}">${v.naam}</option>`).join("");

    return `<div class="startnieuw">
      <select class="startnieuwselect">
        <option value="">Geen vereniging</option>
        ${opties}
        <option value="__nieuw__">+ Nieuwe vereniging…</option>
      </select>
      <input type="text" class="startnieuwnaam" placeholder="Naam van de nieuwe vereniging" hidden>
      <button class="ghost" data-aanmaken="1">Aanmaken</button>
      <button class="ghost" data-annuleer="1">Annuleren</button>
    </div>`;
  },

  opstellingAanmaken(zaalId, wrap) {
    const select = wrap.querySelector(".startnieuwselect");
    let verenigingId = select.value || null;

    if (verenigingId === "__nieuw__") {
      const naam = wrap.querySelector(".startnieuwnaam").value.trim();
      if (!naam) { alert("Vul een naam voor de nieuwe vereniging in."); return; }
      verenigingId = Model.nieuweVereniging(naam).id;
    }

    const opstelling = Model.nieuweOpstelling(zaalId, verenigingId);
    this.nieuwIn = null;
    if (this.opWijziging) this.opWijziging();
    naarTekenen(opstelling);
  },

  /* ---------------- een opstelling wijzigen of verwijderen ----------------
     Een opstelling heeft geen eigen naam — wat je in de lijst ziet is de
     naam van zijn vereniging. "De naam wijzigen" is dus: een andere
     vereniging koppelen (of loskoppelen). Andere velden (gebruiksmoment,
     aantal personen, opmerkingen) horen bij scherm 2, dat er nog niet is. */

  opstellingBewerkFormulier(o) {
    const opties = Model.document.verenigingen.map(v =>
      `<option value="${v.id}" ${o.verenigingId === v.id ? "selected" : ""}>${v.naam}</option>`).join("");

    return `<div class="startnieuw">
      <select class="startnieuwselect">
        <option value="" ${!o.verenigingId ? "selected" : ""}>Geen vereniging</option>
        ${opties}
        <option value="__nieuw__">+ Nieuwe vereniging…</option>
      </select>
      <input type="text" class="startnieuwnaam" placeholder="Naam van de nieuwe vereniging" hidden>
      <button class="ghost" data-opslaan="${o.id}">Opslaan</button>
      <button class="ghost" data-annuleerbewerk="${o.id}">Annuleren</button>
    </div>`;
  },

  opstellingBewerken(id, wrap) {
    const opstelling = Model.opstelling(id);
    const select = wrap.querySelector(".startnieuwselect");
    let verenigingId = select.value || null;

    if (verenigingId === "__nieuw__") {
      const naam = wrap.querySelector(".startnieuwnaam").value.trim();
      if (!naam) { alert("Vul een naam voor de nieuwe vereniging in."); return; }
      verenigingId = Model.nieuweVereniging(naam).id;
    }

    opstelling.verenigingId = verenigingId;
    this.bewerkIn = null;
    if (this.opWijziging) this.opWijziging();
    this.tekenLijst();
  },

  opstellingVerwijderen(id) {
    const opstelling = Model.opstelling(id);
    const vereniging = opstelling.verenigingId && Model.vereniging(opstelling.verenigingId);
    const naam = vereniging ? `de opstelling van "${vereniging.naam}"` : "deze naamloze opstelling";
    if (!confirm(`Wil je ${naam} verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;

    Model.document.opstellingen = Model.document.opstellingen.filter(x => x !== opstelling);
    if (this.opWijziging) this.opWijziging();
    this.tekenLijst();
  },

  /* ---------------- knoppen en zoekveld ---------------- */

  bedieningAanzetten() {
    this._onKlik = ev => {
      const nieuwKnop = ev.target.closest("[data-nieuwopstelling]");
      if (nieuwKnop) { this.nieuwIn = nieuwKnop.dataset.nieuwopstelling; this.tekenLijst(); return; }

      const annuleer = ev.target.closest("[data-annuleer]");
      if (annuleer) { this.nieuwIn = null; this.tekenLijst(); return; }

      const aanmaken = ev.target.closest("[data-aanmaken]");
      if (aanmaken) { this.opstellingAanmaken(this.nieuwIn, aanmaken.closest(".startnieuw")); return; }

      const bewerk = ev.target.closest("[data-bewerk]");
      if (bewerk) { this.bewerkIn = bewerk.dataset.bewerk; this.tekenLijst(); return; }

      const annuleerBewerk = ev.target.closest("[data-annuleerbewerk]");
      if (annuleerBewerk) { this.bewerkIn = null; this.tekenLijst(); return; }

      const opslaan = ev.target.closest("[data-opslaan]");
      if (opslaan) { this.opstellingBewerken(opslaan.dataset.opslaan, opslaan.closest(".startnieuw")); return; }

      const verwijder = ev.target.closest("[data-verwijder]");
      if (verwijder) { this.opstellingVerwijderen(verwijder.dataset.verwijder); return; }

      const regel = ev.target.closest("[data-opstelling]");
      if (regel) naarTekenen(Model.opstelling(regel.dataset.opstelling));
    };
    document.getElementById("startscherm").addEventListener("click", this._onKlik);

    this._onChange = ev => {
      if (!ev.target.classList.contains("startnieuwselect")) return;
      const wrap = ev.target.closest(".startnieuw");
      wrap.querySelector(".startnieuwnaam").hidden = ev.target.value !== "__nieuw__";
    };
    document.getElementById("startscherm").addEventListener("change", this._onChange);

    // los gebonden, niet via tekenLijst(): het veld zelf wordt nooit opnieuw
    // aangemaakt, anders raak je de cursor kwijt bij elke toetsaanslag
    this._onZoek = ev => { this.zoekterm = ev.target.value; this.tekenLijst(); };
    document.getElementById("startZoek").addEventListener("input", this._onZoek);
  },

  /* Aangeroepen door app.js vlak voordat een ander scherm opent. */
  sluiten() {
    document.getElementById("startscherm").removeEventListener("click", this._onKlik);
    document.getElementById("startscherm").removeEventListener("change", this._onChange);
    document.getElementById("startZoek").removeEventListener("input", this._onZoek);
  }
};
