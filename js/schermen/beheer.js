/* schermen/beheer.js — schermen 5, 7 en 8: verenigingen, meubilair en de
   voorraad per zaal onderhouden.

   Drie tabbladen in één bestand, zoals het architectuurvoorstel voorschrijft:
   het zijn alledrie een lijst, een formulier en opslaan. Net als het
   startscherm (schermen/start.js) gebruikt dit geen svg-plattegrond, maar een
   eigen lijst in #beheerscherm. */

const SchermBeheer = {

  tab: "verenigingen",       // "verenigingen" | "meubilair" | "voorraad"

  bewerkVereniging: null,    // de vereniging-id waarvoor het wijzig-formulier openstaat
  nieuwVereniging: false,    // staat het "nieuwe vereniging"-formulier open

  bewerkMeubel: null,        // de meubeltype-id waarvoor het wijzig-formulier openstaat
  nieuwMeubelSoort: null,    // "tafel" of "object": welk "nieuw meubeltype"-formulier openstaat

  voorraadZaalId: null,      // welke zaal er getoond wordt op het voorraadtabblad

  open() {
    this.bewerkVereniging = null;
    this.nieuwVereniging = false;
    this.bewerkMeubel = null;
    this.nieuwMeubelSoort = null;

    document.getElementById("beheerscherm").innerHTML = `
      <div class="startkop"><h1>Beheer</h1></div>
      <div class="beheertabs">
        <button class="beheertab" data-tab="verenigingen">Verenigingen</button>
        <button class="beheertab" data-tab="meubilair">Meubilair</button>
        <button class="beheertab" data-tab="voorraad">Voorraad per zaal</button>
      </div>
      <div id="beheerInhoud"></div>`;

    this.tekenInhoud();
    this.bedieningAanzetten();
  },

  /* Wordt door app.js ingevuld en aangeroepen na elke bewaarde wijziging. */
  opWijziging: null,

  tekenInhoud() {
    document.querySelectorAll(".beheertab").forEach(knop =>
      knop.classList.toggle("actief", knop.dataset.tab === this.tab));

    const vak = document.getElementById("beheerInhoud");
    if (this.tab === "verenigingen")    vak.innerHTML = this.tabVerenigingen();
    else if (this.tab === "meubilair")  vak.innerHTML = this.tabMeubilair();
    else                                vak.innerHTML = this.tabVoorraad();
  },

  /* ================= scherm 5: verenigingen ================= */

  tabVerenigingen() {
    const regels = Model.document.verenigingen.map(v => this.verenigingRegel(v)).join("");
    const nieuw = this.nieuwVereniging ? this.verenigingFormulier() : "";

    return `<div class="startlijst">
      <div class="startzaal">
        <div class="startzaalkop">
          <span class="startzaalnaam">Verenigingen</span>
          <button class="ghost" data-nieuwevereniging="1">+ Nieuwe vereniging</button>
        </div>
        ${regels || '<p class="empty">Nog geen verenigingen.</p>'}
        ${nieuw}
      </div>
    </div>`;
  },

  /* Per vereniging welke opstellingen erbij horen en in welke zalen, zoals het
     functioneel ontwerp vraagt. Een vereniging met opstellingen mag niet
     verwijderd worden — de knop is dan uitgeschakeld. */
  verenigingRegel(v) {
    if (this.bewerkVereniging === v.id) return this.verenigingFormulier(v);

    const opstellingen = Model.document.opstellingen.filter(o => o.verenigingId === v.id);
    const gebruik = opstellingen.length
      ? opstellingen.map(o => Model.zaal(o.zaalId).naam).join(", ")
      : "Niet in gebruik";

    return `<div class="startregel">
      <span class="startregelnaam">
        <span class="startvereniging">${v.naam}</span>
        <span class="startmoment">${gebruik}</span>
      </span>
      <button class="ghost klein" data-verenigingbewerk="${v.id}">Wijzigen</button>
      <button class="ghost klein" data-verenigingverwijder="${v.id}"
        ${opstellingen.length ? 'disabled title="Nog in gebruik bij een opstelling"' : ""}>Verwijderen</button>
    </div>`;
  },

  /* Zonder `v`: het "nieuwe vereniging"-formulier. Met `v`: hetzelfde
     formulier, maar dan om een bestaande naam te wijzigen. */
  verenigingFormulier(v) {
    return `<div class="startbewerk startformulier">
      <div class="veld-vol"><label>Naam</label>
        <input type="text" class="bwVerenigingNaam" value="${v ? v.naam : ""}"></div>
      <div class="row">
        <button class="ghost" ${v ? `data-verenigingopslaan="${v.id}"` : 'data-verenigingaanmaken="1"'}>
          ${v ? "Opslaan" : "Aanmaken"}</button>
        <button class="ghost" ${v ? `data-verenigingannuleer="${v.id}"` : 'data-verenigingannuleernieuw="1"'}>Annuleren</button>
      </div>
    </div>`;
  },

  verenigingAanmaken(wrap) {
    const naam = wrap.querySelector(".bwVerenigingNaam").value.trim();
    if (!naam) { alert("Vul een naam voor de vereniging in."); return; }

    Model.nieuweVereniging(naam);
    this.nieuwVereniging = false;
    if (this.opWijziging) this.opWijziging();
    this.tekenInhoud();
  },

  verenigingOpslaan(id, wrap) {
    const naam = wrap.querySelector(".bwVerenigingNaam").value.trim();
    if (!naam) { alert("Vul een naam voor de vereniging in."); return; }

    Model.vereniging(id).naam = naam;
    this.bewerkVereniging = null;
    if (this.opWijziging) this.opWijziging();
    this.tekenInhoud();
  },

  verenigingVerwijderen(id) {
    if (Model.verenigingInGebruik(id)) return;   // defensief; de knop staat al uit
    const v = Model.vereniging(id);
    if (!confirm(`"${v.naam}" verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;

    Model.document.verenigingen = Model.document.verenigingen.filter(x => x !== v);
    if (this.opWijziging) this.opWijziging();
    this.tekenInhoud();
  },

  /* ================= scherm 7: meubilair ================= */

  tabMeubilair() {
    return `<div class="startlijst">
      ${this.meubelSectie("Tafelsoorten", "tafel")}
      ${this.meubelSectie("Verrijdbare objecten", "object")}
    </div>`;
  },

  meubelSectie(titel, soort) {
    const regels = Model.meubeltypen(soort).map(m => this.meubelRegel(m)).join("");
    const nieuw = this.nieuwMeubelSoort === soort ? this.meubelFormulier(soort) : "";
    const enkelvoud = soort === "tafel" ? "tafelsoort" : "object";
    const meervoud = soort === "tafel" ? "tafelsoorten" : "objecten";

    return `<div class="startzaal">
      <div class="startzaalkop">
        <span class="startzaalnaam">${titel}</span>
        <button class="ghost" data-nieuwmeubel="${soort}">+ Nieuwe ${enkelvoud}</button>
      </div>
      ${regels || `<p class="empty">Nog geen ${meervoud}.</p>`}
      ${nieuw}
    </div>`;
  },

  /* Een trapeziumtafel (de tafelkring, zie model.js) krijgt er een derde maat
     bij: de korte zijde. Dat type staat al in de gegevens en wordt hier alleen
     gewijzigd, niet opnieuw aangemaakt — zie meubelFormulier. */
  meubelRegel(m) {
    if (this.bewerkMeubel === m.id) return this.meubelFormulier(m.soort, m);

    const inGebruik = Model.meubeltypeInGebruik(m.id);
    const maat = `${m.breedte} × ${m.diepte} cm` + (m.vorm === "trapezium" ? `, korte zijde ${m.korteZijde} cm` : "");

    return `<div class="startregel">
      <span class="startregelnaam">
        <span class="startvereniging">${m.naam}</span>
        <span class="startmoment">${maat}</span>
      </span>
      <button class="ghost klein" data-meubelbewerk="${m.id}">Wijzigen</button>
      <button class="ghost klein" data-meubelverwijder="${m.id}"
        ${inGebruik ? 'disabled title="Nog in gebruik in een opstelling"' : ""}>Verwijderen</button>
    </div>`;
  },

  symboolOpties(huidig) {
    return Object.entries(Model.objectSymbolen).map(([k, tekst]) =>
      `<option value="${k}" ${huidig === k ? "selected" : ""}>${tekst}</option>`).join("");
  },

  /* Zonder `m`: het "nieuw meubeltype"-formulier voor deze soort. Met `m`:
     hetzelfde formulier, maar dan om een bestaand type te wijzigen. */
  meubelFormulier(soort, m) {
    return `<div class="startbewerk startformulier">
      <div class="veld-vol"><label>Naam</label>
        <input type="text" class="bwMeubelNaam" value="${m ? m.naam : ""}"></div>
      <div class="veld-vol"><label>Breedte (cm)</label>
        <input type="number" min="1" class="bwMeubelBreedte" value="${m ? m.breedte : ""}"></div>
      <div class="veld-vol"><label>Diepte (cm)</label>
        <input type="number" min="1" class="bwMeubelDiepte" value="${m ? m.diepte : ""}"></div>
      ${m && m.vorm === "trapezium" ? `<div class="veld-vol"><label>Korte zijde (cm)</label>
        <input type="number" min="1" class="bwMeubelKorteZijde" value="${m.korteZijde}"></div>` : ""}
      ${soort === "object" ? `<div class="veld-vol"><label>Symbool</label>
        <select class="bwMeubelSymbool">${this.symboolOpties(m ? m.symbool : null)}</select></div>` : ""}
      <div class="row">
        <button class="ghost" ${m ? `data-meubelopslaan="${m.id}"` : `data-meubelaanmaken="${soort}"`}>
          ${m ? "Opslaan" : "Aanmaken"}</button>
        <button class="ghost" ${m ? `data-meubelannuleer="${m.id}"` : 'data-meubelannuleernieuw="1"'}>Annuleren</button>
      </div>
    </div>`;
  },

  meubelVeldenLezen(wrap) {
    const naam = wrap.querySelector(".bwMeubelNaam").value.trim();
    const breedte = parseInt(wrap.querySelector(".bwMeubelBreedte").value, 10);
    const diepte = parseInt(wrap.querySelector(".bwMeubelDiepte").value, 10);
    if (!naam || !breedte || !diepte) {
      alert("Vul een naam, breedte en diepte in.");
      return null;
    }
    const symboolVeld = wrap.querySelector(".bwMeubelSymbool");
    return { naam, breedte, diepte, symbool: symboolVeld ? symboolVeld.value : undefined };
  },

  meubelAanmaken(soort, wrap) {
    const velden = this.meubelVeldenLezen(wrap);
    if (!velden) return;

    Model.nieuwMeubeltype(soort, velden.naam, velden.breedte, velden.diepte, velden.symbool);
    this.nieuwMeubelSoort = null;
    if (this.opWijziging) this.opWijziging();
    this.tekenInhoud();
  },

  meubelOpslaan(id, wrap) {
    const velden = this.meubelVeldenLezen(wrap);
    if (!velden) return;

    const m = Model.meubel(id);
    m.naam = velden.naam;
    m.breedte = velden.breedte;
    m.diepte = velden.diepte;
    if (velden.symbool !== undefined) m.symbool = velden.symbool;

    const korteZijdeVeld = wrap.querySelector(".bwMeubelKorteZijde");
    if (korteZijdeVeld) {
      const korteZijde = parseInt(korteZijdeVeld.value, 10);
      if (!korteZijde) { alert("Vul een korte zijde in."); return; }
      m.korteZijde = korteZijde;
    }

    this.bewerkMeubel = null;
    if (this.opWijziging) this.opWijziging();
    this.tekenInhoud();
  },

  meubelVerwijderen(id) {
    if (Model.meubeltypeInGebruik(id)) return;   // defensief; de knop staat al uit
    const m = Model.meubel(id);
    if (!confirm(`"${m.naam}" verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;

    Model.document.meubeltypen = Model.document.meubeltypen.filter(x => x !== m);
    if (this.opWijziging) this.opWijziging();
    this.tekenInhoud();
  },

  /* ================= scherm 8: voorraad per zaal ================= */

  tabVoorraad() {
    if (!Model.document.zalen.length) {
      return `<p class="empty">Nog geen zalen. Ga naar "Zalen inrichten" om te beginnen.</p>`;
    }
    if (!this.voorraadZaalId || !Model.zaal(this.voorraadZaalId)) {
      this.voorraadZaalId = Model.document.zalen.slice().sort((a, b) => a.volgorde - b.volgorde)[0].id;
    }

    const groepen = Model.document.gebouwen.slice().sort((a, b) => a.volgorde - b.volgorde)
      .map(gebouw => {
        const zalen = Model.document.zalen.filter(z => z.gebouwId === gebouw.id)
          .sort((a, b) => a.volgorde - b.volgorde);
        if (!zalen.length) return "";
        const opties = zalen.map(z =>
          `<option value="${z.id}" ${z.id === this.voorraadZaalId ? "selected" : ""}>${z.naam}</option>`).join("");
        return `<optgroup label="${gebouw.naam}">${opties}</optgroup>`;
      }).join("");

    return `<div class="beheervak">
      <div class="veld-vol"><label>Zaal</label>
        <select id="voorraadZaalSelect">${groepen}</select>
      </div>
      ${this.voorraadVelden(Model.zaal(this.voorraadZaalId))}
    </div>`;
  },

  voorraadVelden(zaal) {
    const voorraad = zaal.voorraad || {};

    const groep = (titel, soort) => {
      const rijen = Model.meubeltypen(soort).map(m => `
        <div class="field"><label>${m.naam}</label>
          <input type="number" min="0" data-voorraad="${m.id}" value="${voorraad[m.id] || 0}">
        </div>`).join("");
      return rijen ? `<h2 style="margin-top:20px">${titel}</h2>${rijen}` : "";
    };

    return groep("Stoelen", "stoel") + groep("Tafels", "tafel") + groep("Verrijdbare objecten", "object");
  },

  /* ---------------- knoppen, velden en tabbladen ---------------- */

  bedieningAanzetten() {
    this._onKlik = ev => {
      const tabKnop = ev.target.closest("[data-tab]");
      if (tabKnop) { this.tab = tabKnop.dataset.tab; this.tekenInhoud(); return; }

      const nieuweVerenigingKnop = ev.target.closest("[data-nieuwevereniging]");
      if (nieuweVerenigingKnop) { this.nieuwVereniging = true; this.tekenInhoud(); return; }

      const verenigingAnnuleerNieuw = ev.target.closest("[data-verenigingannuleernieuw]");
      if (verenigingAnnuleerNieuw) { this.nieuwVereniging = false; this.tekenInhoud(); return; }

      const verenigingAanmaken = ev.target.closest("[data-verenigingaanmaken]");
      if (verenigingAanmaken) { this.verenigingAanmaken(verenigingAanmaken.closest(".startformulier")); return; }

      const verenigingBewerk = ev.target.closest("[data-verenigingbewerk]");
      if (verenigingBewerk) { this.bewerkVereniging = verenigingBewerk.dataset.verenigingbewerk; this.tekenInhoud(); return; }

      const verenigingAnnuleer = ev.target.closest("[data-verenigingannuleer]");
      if (verenigingAnnuleer) { this.bewerkVereniging = null; this.tekenInhoud(); return; }

      const verenigingOpslaan = ev.target.closest("[data-verenigingopslaan]");
      if (verenigingOpslaan) { this.verenigingOpslaan(verenigingOpslaan.dataset.verenigingopslaan, verenigingOpslaan.closest(".startformulier")); return; }

      const verenigingVerwijder = ev.target.closest("[data-verenigingverwijder]");
      if (verenigingVerwijder) { this.verenigingVerwijderen(verenigingVerwijder.dataset.verenigingverwijder); return; }

      const nieuwMeubelKnop = ev.target.closest("[data-nieuwmeubel]");
      if (nieuwMeubelKnop) { this.nieuwMeubelSoort = nieuwMeubelKnop.dataset.nieuwmeubel; this.tekenInhoud(); return; }

      const meubelAnnuleerNieuw = ev.target.closest("[data-meubelannuleernieuw]");
      if (meubelAnnuleerNieuw) { this.nieuwMeubelSoort = null; this.tekenInhoud(); return; }

      const meubelAanmaken = ev.target.closest("[data-meubelaanmaken]");
      if (meubelAanmaken) { this.meubelAanmaken(meubelAanmaken.dataset.meubelaanmaken, meubelAanmaken.closest(".startformulier")); return; }

      const meubelBewerk = ev.target.closest("[data-meubelbewerk]");
      if (meubelBewerk) { this.bewerkMeubel = meubelBewerk.dataset.meubelbewerk; this.tekenInhoud(); return; }

      const meubelAnnuleer = ev.target.closest("[data-meubelannuleer]");
      if (meubelAnnuleer) { this.bewerkMeubel = null; this.tekenInhoud(); return; }

      const meubelOpslaan = ev.target.closest("[data-meubelopslaan]");
      if (meubelOpslaan) { this.meubelOpslaan(meubelOpslaan.dataset.meubelopslaan, meubelOpslaan.closest(".startformulier")); return; }

      const meubelVerwijder = ev.target.closest("[data-meubelverwijder]");
      if (meubelVerwijder) { this.meubelVerwijderen(meubelVerwijder.dataset.meubelverwijder); return; }
    };
    document.getElementById("beheerscherm").addEventListener("click", this._onKlik);

    this._onChange = ev => {
      if (ev.target.id !== "voorraadZaalSelect") return;
      this.voorraadZaalId = ev.target.value;
      this.tekenInhoud();
    };
    document.getElementById("beheerscherm").addEventListener("change", this._onChange);

    // los gebonden, niet via tekenInhoud(): anders raak je bij elke stap van
    // het aantal de cursor/focus kwijt
    this._onInput = ev => {
      const veld = ev.target.closest("[data-voorraad]");
      if (!veld) return;
      const zaal = Model.zaal(this.voorraadZaalId);
      if (!zaal.voorraad) zaal.voorraad = {};
      zaal.voorraad[veld.dataset.voorraad] = parseInt(veld.value, 10) || 0;
      if (this.opWijziging) this.opWijziging();
    };
    document.getElementById("beheerscherm").addEventListener("input", this._onInput);
  },

  /* Aangeroepen door app.js vlak voordat een ander scherm opent. */
  sluiten() {
    document.getElementById("beheerscherm").removeEventListener("click", this._onKlik);
    document.getElementById("beheerscherm").removeEventListener("change", this._onChange);
    document.getElementById("beheerscherm").removeEventListener("input", this._onInput);
  }
};
